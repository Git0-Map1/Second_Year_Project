const Property = require("../models/Property");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");

const {
  uploadToCloudinary,
  uploadDocumentToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinaryUpload");

const CloudinaryCleanup = require("../models/CloudinaryCleanup");

// HELPER: Save failed Cloudinary deletion for retry

const queueCloudinaryCleanup = async (image, propertyId = null, error) => {
  if (!image?.publicId) {
    throw new Error("Invalid Cloudinary cleanup image");
  }

  await CloudinaryCleanup.updateOne(
    { publicId: image.publicId },
    {
      $setOnInsert: {
        publicId: image.publicId,
        imageUrl: image.imageUrl,
      },
      $set: {
        ...(propertyId && { propertyId }),
        lastError: error?.message || "Cloudinary deletion failed",
        nextAttemptAt: new Date(),
      },
    },
    { upsert: true },
  );
};

// HELPER: Delete uploaded assets or queue failed cleanup

const cleanupUploadedAssets = async (assets) => {
  const results = await Promise.allSettled(
    assets.map((asset) => deleteFromCloudinary(asset.publicId)),
  );

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const asset = assets[i];

      try {
        await queueCloudinaryCleanup(asset, null, results[i].reason);
      } catch (error) {
        console.error(
          "Failed to queue Cloudinary cleanup:",
          asset.publicId,
          error.message,
        );
      }
    }
  }
};

// CREATE PROPERTY

const createProperty = async (req, res) => {
  let uploadedImages = [];
  let uploadedLalpurja = null;
  let propertySaved = false;

  try {
    const {
      title,
      description,
      propertyType,
      listingType,
      price,
      location,
      area,
      areaUnit,
      bedrooms,
      bathrooms,
    } = req.body;

    const files = req.files?.images || [];
    const lalpurjaFile = req.files?.lalpurja?.[0];

    if (!lalpurjaFile) {
      return res.status(400).json({
        message: "Lalpurja document is required",
        success: false,
      });
    }

    // Upload Lalpurja
    uploadedLalpurja = await uploadDocumentToCloudinary(lalpurjaFile.buffer);

    // Upload property images
    const uploadResults = await Promise.allSettled(
      files.map((file) => uploadToCloudinary(file.buffer)),
    );

    uploadedImages = uploadResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    const failedUpload = uploadResults.find(
      (result) => result.status === "rejected",
    );

    if (failedUpload) {
      throw failedUpload.reason;
    }

    // Create property
    const property = new Property({
      title,
      description,
      propertyType,
      listingType,
      price,
      location,
      area,
      areaUnit,
      bedrooms,
      bathrooms,
      images: uploadedImages,
      lalpurja: {
        imageUrl: uploadedLalpurja.imageUrl,
        publicId: uploadedLalpurja.publicId,
      },
      seller: req.user._id,
    });

    await property.save();
    propertySaved = true;

    return res.status(201).json({
      message: "Property submitted for verification",
      success: true,
      property,
    });
  } catch (err) {
    console.error("Create Property Error:", err);

    // Never delete assets after property has been saved
    if (!propertySaved) {
      const assetsToClean = [
        ...uploadedImages,
        ...(uploadedLalpurja ? [uploadedLalpurja] : []),
      ];

      await cleanupUploadedAssets(assetsToClean);
    }

    return res.status(500).json({
      message: "Property creation failed",
      success: false,
    });
  }
};

// GET ALL AVAILABLE PROPERTIES

const getAllProperties = async (req, res) => {
  try {
    const {
      location,
      propertyType,
      listingType,
      minPrice,
      maxPrice,
      areaUnit,
      minArea,
      maxArea,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    const validPropertyTypes = ["house", "land", "apartment", "commercial"];

    if (propertyType && !validPropertyTypes.includes(propertyType)) {
      return res.status(400).json({
        message: "Invalid property type",
        success: false,
      });
    }

    if (listingType && !["sale", "rent"].includes(listingType)) {
      return res.status(400).json({
        message: "Invalid listing type",
        success: false,
      });
    }

    if (
      areaUnit &&
      !["aana", "ropani", "sqft", "sqm", "dhur", "katha"].includes(areaUnit)
    ) {
      return res.status(400).json({
        message: "Invalid area unit",
        success: false,
      });
    }

    const numericFields = [
      "minPrice",
      "maxPrice",
      "minArea",
      "maxArea",
      "minBedrooms",
      "maxBedrooms",
      "minBathrooms",
      "maxBathrooms",
    ];

    for (const field of numericFields) {
      if (req.query[field] !== undefined) {
        const value = Number(req.query[field]);

        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({
            message: `Invalid value for ${field}`,
            success: false,
          });
        }
      }
    }

    if (
      sort &&
      !["price_desc", "price_asc", "newest", "oldest"].includes(sort)
    ) {
      return res.status(400).json({
        message: "Invalid sorting option",
        success: false,
      });
    }

    const ranges = [
      ["minPrice", "maxPrice"],
      ["minArea", "maxArea"],
      ["minBedrooms", "maxBedrooms"],
      ["minBathrooms", "maxBathrooms"],
    ];

    for (const [min, max] of ranges) {
      if (
        req.query[min] !== undefined &&
        req.query[max] !== undefined &&
        Number(req.query[min]) > Number(req.query[max])
      ) {
        return res.status(400).json({
          message: `${min} cannot be greater than ${max}`,
          success: false,
        });
      }
    }

    const filter = {
      status: "available",
      $or: [{ deletionState: "active" }, { deletionState: { $exists: false } }],
    };

    if (location) {
      filter.location = {
        $regex: location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    if (propertyType) filter.propertyType = propertyType;
    if (listingType) filter.listingType = listingType;
    if (areaUnit) filter.areaUnit = areaUnit;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};

      if (minPrice !== undefined) {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    if (minArea !== undefined || maxArea !== undefined) {
      filter.area = {};

      if (minArea !== undefined) {
        filter.area.$gte = Number(minArea);
      }

      if (maxArea !== undefined) {
        filter.area.$lte = Number(maxArea);
      }
    }

    if (minBedrooms !== undefined || maxBedrooms !== undefined) {
      filter.bedrooms = {};

      if (minBedrooms !== undefined) {
        filter.bedrooms.$gte = Number(minBedrooms);
      }

      if (maxBedrooms !== undefined) {
        filter.bedrooms.$lte = Number(maxBedrooms);
      }
    }

    if (minBathrooms !== undefined || maxBathrooms !== undefined) {
      filter.bathrooms = {};

      if (minBathrooms !== undefined) {
        filter.bathrooms.$gte = Number(minBathrooms);
      }

      if (maxBathrooms !== undefined) {
        filter.bathrooms.$lte = Number(maxBathrooms);
      }
    }

    const currentPage = Math.max(1, parseInt(page, 10) || 1);

    const itemsPerPage = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const skip = (currentPage - 1) * itemsPerPage;

    let sortOption = { createdAt: -1 };

    if (sort === "price_asc") sortOption = { price: 1 };
    if (sort === "price_desc") sortOption = { price: -1 };
    if (sort === "newest") sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };

    const totalProperties = await Property.countDocuments(filter);

    const properties = await Property.find(filter)
      .populate("seller", "name email")
      .sort(sortOption)
      .skip(skip)
      .limit(itemsPerPage);

    return res.status(200).json({
      success: true,
      count: properties.length,
      totalProperties,
      currentPage,
      totalPages: Math.ceil(totalProperties / itemsPerPage),
      properties,
    });
  } catch (err) {
    console.error("Get Properties Error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// GET PROPERTY BY ID

const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Property Id",
        success: false,
      });
    }

    const property = await Property.findOne({
      _id: id,
      status: "available",
      $or: [{ deletionState: "active" }, { deletionState: { $exists: false } }],
    }).populate("seller", "name email");

    if (!property) {
      return res.status(404).json({
        message: "Property Not Found",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      property,
    });
  } catch (err) {
    console.error("Get Property Error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// SELLER: GET MY PROPERTIES

const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      seller: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    console.error("Get My Properties Error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// SELLER: UPDATE PROPERTY
const updateProperty = async (req, res) => {
  let uploadedImages = [];
  let uploadedLalpurja = null;
  let oldAssets = [];
  let lockedPropertyId = null;
  let propertySaved = false;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid property ID",
        success: false,
      });
    }

    // Acquire update lock
    const property = await Property.findOneAndUpdate(
      {
        _id: id,
        seller: req.user._id,
        $or: [
          { deletionState: "active" },
          { deletionState: { $exists: false } },
        ],
      },
      {
        $set: {
          deletionState: "updating",
        },
      },
      { new: true },
    );

    if (!property) {
      const existingProperty = await Property.findById(id);

      if (!existingProperty) {
        return res.status(404).json({
          message: "Property Not Found",
          success: false,
        });
      }

      if (existingProperty.seller.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You are not authorized to update this property",
          success: false,
        });
      }

      return res.status(409).json({
        message: "Property is already being updated or deleted",
        success: false,
      });
    }

    lockedPropertyId = property._id;

    const allowedFields = [
      "title",
      "description",
      "propertyType",
      "listingType",
      "price",
      "location",
      "area",
      "areaUnit",
      "bedrooms",
      "bathrooms",
    ];

    let hasUpdates = false;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        property[field] = req.body[field];
        hasUpdates = true;
      }
    }

    // Validate images selected for removal
    let removeImagePublicIds = [];

    if (req.body.removeImagePublicIds !== undefined) {
      try {
        removeImagePublicIds =
          typeof req.body.removeImagePublicIds === "string"
            ? JSON.parse(req.body.removeImagePublicIds)
            : req.body.removeImagePublicIds;
      } catch {
        return res.status(400).json({
          message: "Invalid removeImagePublicIds format",
          success: false,
        });
      }

      if (
        !Array.isArray(removeImagePublicIds) ||
        !removeImagePublicIds.every(
          (publicId) =>
            typeof publicId === "string" && publicId.trim().length > 0,
        )
      ) {
        return res.status(400).json({
          message: "removeImagePublicIds must be an array of valid public IDs",
          success: false,
        });
      }
    }

    const idsToRemove = [...new Set(removeImagePublicIds)];

    const imagesToRemove = property.images.filter((image) =>
      idsToRemove.includes(image.publicId),
    );

    if (imagesToRemove.length !== idsToRemove.length) {
      return res.status(400).json({
        message: "One or more selected images were not found",
        success: false,
      });
    }

    if (idsToRemove.length > 0) {
      property.images = property.images.filter(
        (image) => !idsToRemove.includes(image.publicId),
      );

      oldAssets.push(...imagesToRemove);
      hasUpdates = true;
    }

    // Replacement Lalpurja
    const lalpurjaFile = req.files?.lalpurja?.[0];

    if (lalpurjaFile) {
      uploadedLalpurja = await uploadDocumentToCloudinary(lalpurjaFile.buffer);

      if (property.lalpurja?.publicId) {
        oldAssets.push({
          imageUrl: property.lalpurja.imageUrl,
          publicId: property.lalpurja.publicId,
        });
      }

      property.lalpurja = {
        imageUrl: uploadedLalpurja.imageUrl,
        publicId: uploadedLalpurja.publicId,
      };

      hasUpdates = true;
    }

    // Upload new property images
    const files = req.files?.images || [];

    const uploadResults = await Promise.allSettled(
      files.map((file) => uploadToCloudinary(file.buffer)),
    );

    uploadedImages = uploadResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    const failedUpload = uploadResults.find(
      (result) => result.status === "rejected",
    );

    if (failedUpload) {
      throw failedUpload.reason;
    }

    if (uploadedImages.length > 0) {
      property.images.push(...uploadedImages);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return res.status(400).json({
        message: "No valid fields provided for update",
        success: false,
      });
    }

    // Require admin verification again
    property.status = "pending";

    // Save updated property
    await property.save();
    propertySaved = true;

    // Old assets are no longer referenced by the property.
    // Attempt to delete them from Cloudinary.
    const deletionResults = await Promise.allSettled(
      oldAssets.map((asset) => deleteFromCloudinary(asset.publicId)),
    );

    const successfullyDeletedIds = [];
    const failedAssets = [];

    for (let i = 0; i < deletionResults.length; i++) {
      const result = deletionResults[i];
      const asset = oldAssets[i];

      if (result.status === "fulfilled") {
        successfullyDeletedIds.push(asset.publicId);
      } else {
        failedAssets.push({
          asset,
          error: result.reason,
        });
      }
    }

    // Remove existing centralized cleanup records
    if (successfullyDeletedIds.length > 0) {
      await CloudinaryCleanup.deleteMany({
        publicId: { $in: successfullyDeletedIds },
      });
    }

    // Queue failed deletions
    const failedQueueAssets = [];

    for (const item of failedAssets) {
      try {
        await queueCloudinaryCleanup(item.asset, property._id, item.error);
      } catch (queueError) {
        console.error(
          "Failed to queue old asset:",
          item.asset.publicId,
          queueError.message,
        );

        failedQueueAssets.push(item.asset);
      }
    }

    // Fallback storage if the centralized queue itself fails
    if (failedQueueAssets.length > 0) {
      property.cleanupImages = property.cleanupImages || [];

      for (const asset of failedQueueAssets) {
        const exists = property.cleanupImages.some(
          (item) => item.publicId === asset.publicId,
        );

        if (!exists) {
          property.cleanupImages.push({
            imageUrl: asset.imageUrl,
            publicId: asset.publicId,
            failedAt: new Date(),
          });
        }
      }

      await property.save();
    }

    return res.status(200).json({
      message:
        failedAssets.length > 0
          ? "Property updated, but some old assets require Cloudinary cleanup"
          : "Property updated successfully",
      success: true,
      cloudinaryCleanupWarning: failedAssets.length > 0,
      pendingCleanupImages: failedAssets.length,
      property,
    });
  } catch (err) {
    console.error("Update Property Error:", err);

    // Clean up newly uploaded assets only if property was not saved
    if (!propertySaved) {
      const assetsToClean = [
        ...uploadedImages,
        ...(uploadedLalpurja ? [uploadedLalpurja] : []),
      ];

      await cleanupUploadedAssets(assetsToClean);
    }

    return res.status(500).json({
      message: "Property update failed",
      success: false,
    });
  } finally {
    // Release only the update lock acquired by this request
    if (lockedPropertyId) {
      try {
        await Property.updateOne(
          {
            _id: lockedPropertyId,
            deletionState: "updating",
          },
          {
            $set: {
              deletionState: "active",
            },
          },
        );
      } catch (lockError) {
        console.error(
          "Failed to release property update lock:",
          lockError.message,
        );
      }
    }
  }
};

// SELLER: DELETE PROPERTY

const deleteProperty = async (req, res) => {
  let lockedPropertyId = null;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid property ID",
        success: false,
      });
    }

    // Acquire deletion lock
    const property = await Property.findOneAndUpdate(
      {
        _id: id,
        seller: req.user._id,
        $or: [
          { deletionState: "active" },
          { deletionState: { $exists: false } },
        ],
      },
      {
        $set: {
          deletionState: "deleting",
        },
      },
      { new: true },
    );

    if (!property) {
      const existingProperty = await Property.findById(id);

      if (!existingProperty) {
        return res.status(404).json({
          message: "Property Not Found",
          success: false,
        });
      }

      if (existingProperty.seller.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You are not authorized to delete this property",
          success: false,
        });
      }

      return res.status(409).json({
        message: "Property is already being updated or deleted",
        success: false,
      });
    }

    lockedPropertyId = property._id;

    // Protect properties with active bookings or payments
    const activeBooking = await Booking.findOne({
      property: id,
      $or: [
        { bookingStatus: "pending", paymentStatus: "pending" },
        { bookingStatus: "pending", paymentStatus: "paid" },
        { bookingStatus: "approved", paymentStatus: "paid" },
        { bookingStatus: "expired", paymentStatus: "paid" },
        { bookingStatus: "cancelled", paymentStatus: "paid" },
        { bookingStatus: "rejected", paymentStatus: "paid" },
      ],
    });

    if (property.status === "booked" || activeBooking) {
      return res.status(400).json({
        message:
          "This property cannot be deleted because it has an active booking or payment.",
        success: false,
      });
    }

    // Collect all assets, including legacy fallback assets
    // and assets already waiting in the centralized cleanup queue.
    const existingCleanupRecords = await CloudinaryCleanup.find({
      propertyId: property._id,
    });

    const allAssets = [
      ...(property.images || []),
      ...(property.cleanupImages || []),
      ...(property.lalpurja?.publicId ? [property.lalpurja] : []),
      ...existingCleanupRecords.map((record) => ({
        imageUrl: record.imageUrl,
        publicId: record.publicId,
      })),
    ];

    // Remove duplicate Cloudinary public IDs
    const uniqueAssets = [
      ...new Map(
        allAssets
          .filter((asset) => asset.publicId)
          .map((asset) => [asset.publicId, asset]),
      ).values(),
    ];

    // Attempt Cloudinary deletion
    const results = await Promise.allSettled(
      uniqueAssets.map((asset) => deleteFromCloudinary(asset.publicId)),
    );

    const successfulIds = [];
    const failedAssets = [];

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") {
        successfulIds.push(uniqueAssets[i].publicId);
      } else {
        failedAssets.push({
          asset: uniqueAssets[i],
          error: results[i].reason,
        });
      }
    }

    if (successfullyDeletedIds.length > 0) {
      try {
        await CloudinaryCleanup.deleteMany({
          publicId: { $in: successfullyDeletedIds },
        });
      } catch (cleanupRecordError) {
        console.error(
          "Failed to remove completed Cloudinary cleanup records:",
          cleanupRecordError.message,
        );
      }
    }

    let cleanupSaveFailed = false;

    // Save failed deletions in centralized cleanup collection
    for (const item of failedAssets) {
      try {
        await queueCloudinaryCleanup(item.asset, property._id, item.error);
      } catch (error) {
        cleanupSaveFailed = true;

        console.error(
          "Failed to save cleanup record:",
          item.asset.publicId,
          error.message,
        );
      }
    }

    // If any deletion failed, retain property for cron cleanup
    if (failedAssets.length > 0) {
      property.deletionPending = true;
      property.deletionState = "cleanup_pending";

      // Keep fallback copies if cleanup records could not be saved
      property.cleanupImages = cleanupSaveFailed
        ? failedAssets.map((item) => ({
            imageUrl: item.asset.imageUrl,
            publicId: item.asset.publicId,
            failedAt: new Date(),
          }))
        : [];

      await property.save();

      return res.status(500).json({
        message:
          "Some assets could not be deleted. Property was retained for cleanup retry.",
        success: false,
        failedDeletions: failedAssets.length,
        cleanupRecordsSaved: !cleanupSaveFailed,
      });
    }

    // All Cloudinary assets were deleted.
    // Permanently delete only while holding the deletion lock.
    const deletedProperty = await Property.findOneAndDelete({
      _id: id,
      seller: req.user._id,
      deletionState: "deleting",
    });

    if (!deletedProperty) {
      return res.status(409).json({
        message: "Property deletion could not be completed. Please try again.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Property and its assets deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Delete Property Error:", error);

    return res.status(500).json({
      message: "Error deleting property",
      success: false,
    });
  } finally {
    // IMPORTANT:
    // Do not release cleanup_pending.
    // Only release a lock that is still in deleting state.
    if (lockedPropertyId) {
      try {
        await Property.updateOne(
          {
            _id: lockedPropertyId,
            deletionState: "deleting",
          },
          {
            $set: {
              deletionState: "active",
            },
          },
        );
      } catch (lockError) {
        console.error(
          "Failed to release property deletion lock:",
          lockError.message,
        );
      }
    }
  }
};

// ADMIN: APPROVE PROPERTY

const approveProperty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Property ID",
        success: false,
      });
    }

    const property = await Property.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
        $or: [
          { deletionState: "active" },
          { deletionState: { $exists: false } },
        ],
      },
      {
        $set: {
          status: "available",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!property) {
      return res.status(404).json({
        message: "Pending property not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Property approved successfully",
      success: true,
      property,
    });
  } catch (err) {
    console.error("Approve Property Error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// ADMIN: REJECT PROPERTY

const rejectProperty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid Property Id",
        success: false,
      });
    }

    const property = await Property.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
        $or: [
          { deletionState: "active" },
          { deletionState: { $exists: false } },
        ],
      },
      {
        $set: {
          status: "rejected",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!property) {
      return res.status(404).json({
        message: "Pending property not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Property rejected successfully",
      success: true,
      property,
    });
  } catch (err) {
    console.error("Reject Property Error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// ADMIN: GET PENDING PROPERTIES

const getPendingProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      status: "pending",
      $or: [{ deletionState: "active" }, { deletionState: { $exists: false } }],
    })
      .populate("seller", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    console.error("Get Pending Properties Error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// ADMIN: GET ALL PROPERTIES

const getAllPropertiesForAdmin = async (req, res) => {
  try {
    const properties = await Property.find()
      .populate("seller", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    console.error("Admin Get All Properties Error:", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// EXPORTS

module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  getMyProperties,
  updateProperty,
  deleteProperty,
  approveProperty,
  rejectProperty,
  getPendingProperties,
  getAllPropertiesForAdmin,
};
