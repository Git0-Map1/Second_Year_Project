const Property = require("../models/Property");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { deleteFromCloudinary } = require("../utils/cloudinaryUpload");
const CloudinaryCleanup = require("../models/CloudinaryCleanup");

//sellers add new property
const createProperty = async (req, res) => {
  let uploadedImages = [];
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

    const files = req.files || [];

    // Upload all images
    const uploadResults = await Promise.allSettled(
      files.map((file) => uploadToCloudinary(file.buffer)),
    );

    // Collect successfully uploaded images
    uploadedImages = uploadResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    // Check if any upload failed
    const failedUpload = uploadResults.find(
      (result) => result.status === "rejected",
    );

    if (failedUpload) {
      throw failedUpload.reason;
    }

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

    // Clean up uploaded images if property creation fails
    if (!propertySaved && uploadedImages.length > 0) {
      const cleanupResults = await Promise.allSettled(
        uploadedImages.map((image) => deleteFromCloudinary(image.publicId)),
      );

      for (let i = 0; i < cleanupResults.length; i++) {
        const result = cleanupResults[i];

        if (result.status === "rejected") {
          const image = uploadedImages[i];

          console.error(
            "Cloudinary cleanup failed:",
            image.publicId,
            result.reason.message,
          );

          try {
            await CloudinaryCleanup.updateOne(
              { publicId: image.publicId },
              {
                $setOnInsert: {
                  publicId: image.publicId,
                  imageUrl: image.imageUrl,
                },
                $set: {
                  lastError: result.reason.message,
                  nextAttemptAt: new Date(),
                },
              },
              { upsert: true },
            );
          } catch (cleanupSaveError) {
            console.error(
              "Failed to save Cloudinary cleanup record:",
              cleanupSaveError.message,
            );
          }
        }
      }
    }

    return res.status(500).json({
      message: "Property creation failed",
      success: false,
    });
  }
};

//getting the property or customer view point

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

    //validation
    //validate property type
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
      });
    }

    // Validate numeric query parameters
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

    // Validate minimum and maximum ranges
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
        });
      }
    }

    // Only show available properties
    const filter = {
      status: "available",
    };

    // Search by location (case-insensitive)
    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    // Filter by property type
    if (propertyType) {
      filter.propertyType = propertyType;
    }

    // Filter by listing type
    if (listingType) {
      filter.listingType = listingType;
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};

      if (minPrice !== undefined) {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    // Filter by area unit
    if (areaUnit) {
      filter.areaUnit = areaUnit;
    }

    // Filter by area range
    if (minArea !== undefined || maxArea !== undefined) {
      filter.area = {};

      if (minArea !== undefined) {
        filter.area.$gte = Number(minArea);
      }

      if (maxArea !== undefined) {
        filter.area.$lte = Number(maxArea);
      }
    }

    //filter by bedrooms
    if (minBedrooms !== undefined || maxBedrooms !== undefined) {
      filter.bedrooms = {};
      if (minBedrooms !== undefined) {
        filter.bedrooms.$gte = Number(minBedrooms);
      }

      if (maxBedrooms !== undefined) {
        filter.bedrooms.$lte = Number(maxBedrooms);
      }
    }

    //filter by bathrooms
    if (minBathrooms !== undefined || maxBathrooms !== undefined) {
      filter.bathrooms = {};

      if (minBathrooms !== undefined) {
        filter.bathrooms.$gte = Number(minBathrooms);
      }

      if (maxBathrooms !== undefined) {
        filter.bathrooms.$lte = Number(maxBathrooms);
      }
    }

    // Pagination validation
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const itemsPerPage = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const skip = (currentPage - 1) * itemsPerPage;

    // Sorting
    let sortOption = { createdAt: -1 };

    if (sort === "price_asc") {
      sortOption = { price: 1 };
    } else if (sort === "price_desc") {
      sortOption = { price: -1 };
    } else if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    // Get total matching properties
    const totalProperties = await Property.countDocuments(filter);

    // Get filtered properties
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
    console.error("Get Property Error", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

//seller getting their own properties
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
    console.error("Get Properties Error", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// update property by seller

const updateProperty = async (req, res) => {
  let uploadedImages = [];
  let propertySaved = false;
  let lockedPropertyId = null;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid property ID",
        success: false,
      });
    }
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
      {
        new: true,
      },
    );

    if (property) {
      lockedPropertyId = property._id;
    }

    if (!property) {
      return res.status(404).json({
        message: "Property not found or you are not authorized to update it",
        success: false,
      });
    }

    // Update allowed property fields
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

    // Read image public IDs selected for removal
    let removeImagePublicIds = [];

    if (req.body.removeImagePublicIds !== undefined) {
      try {
        removeImagePublicIds =
          typeof req.body.removeImagePublicIds === "string"
            ? JSON.parse(req.body.removeImagePublicIds)
            : req.body.removeImagePublicIds;
      } catch (error) {
        return res.status(400).json({
          message: "Invalid removeImagePublicIds format. Send a JSON array.",
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

    // Check that requested images belong to this property
    const idsToRemove = [...new Set(removeImagePublicIds)];

    const imagesToRemove = property.images.filter((image) =>
      idsToRemove.includes(image.publicId),
    );

    if (imagesToRemove.length !== idsToRemove.length) {
      return res.status(400).json({
        message: "One or more selected images were not found in this property",
        success: false,
      });
    }

    // Keep images that were not selected for removal
    if (idsToRemove.length > 0) {
      property.images = property.images.filter(
        (image) => !idsToRemove.includes(image.publicId),
      );

      hasUpdates = true;
    }

    // Upload newly added images
    const files = req.files || [];

    for (const file of files) {
      const uploadedImage = await uploadToCloudinary(file.buffer);

      uploadedImages.push({
        imageUrl: uploadedImage.imageUrl,
        publicId: uploadedImage.publicId,
      });
    }

    if (uploadedImages.length > 0) {
      property.images.push(...uploadedImages);
      hasUpdates = true;
    }

    // Check whether anything was updated
    if (!hasUpdates) {
      return res.status(400).json({
        message: "No valid fields provided for update",
        success: false,
      });
    }

    // Save property changes and queue images for deletion
    property.status = "pending";

    property.cleanupImages = property.cleanupImages || [];

    for (const image of imagesToRemove) {
      const alreadyQueued = property.cleanupImages.some(
        (item) => item.publicId === image.publicId,
      );

      if (!alreadyQueued) {
        property.cleanupImages.push({
          imageUrl: image.imageUrl,
          publicId: image.publicId,
          failedAt: new Date(),
        });
      }
    }

    await property.save();
    propertySaved = true;

    // Attempt Cloudinary deletion
    const deletionResults = await Promise.allSettled(
      imagesToRemove.map((image) => deleteFromCloudinary(image.publicId)),
    );

    // Remove successfully deleted images from cleanup queue
    const successfullyDeletedIds = deletionResults
      .map((result, index) =>
        result.status === "fulfilled" ? imagesToRemove[index].publicId : null,
      )
      .filter(Boolean);

    if (successfullyDeletedIds.length > 0) {
      property.cleanupImages = property.cleanupImages.filter(
        (image) => !successfullyDeletedIds.includes(image.publicId),
      );

      await property.save();
    }

    // Identify failed deletions
    const failedDeletions = deletionResults.filter(
      (result) => result.status === "rejected",
    );

    return res.status(200).json({
      message:
        failedDeletions.length > 0
          ? "Property updated, but some images are queued for Cloudinary cleanup"
          : "Property updated successfully",
      success: true,
      cloudinaryCleanupWarning: failedDeletions.length > 0,
      pendingCleanupImages: property.cleanupImages.length,
      property,
    });
  } catch (err) {
    console.error("Update Property Error:", err);

    // Clean up newly uploaded images if property saving fails
    if (!propertySaved && uploadedImages.length > 0) {
      const cleanupResults = await Promise.allSettled(
        uploadedImages.map((image) => deleteFromCloudinary(image.publicId)),
      );

      for (let i = 0; i < cleanupResults.length; i++) {
        const result = cleanupResults[i];

        if (result.status === "rejected") {
          const image = uploadedImages[i];

          try {
            await CloudinaryCleanup.updateOne(
              { publicId: image.publicId },
              {
                $setOnInsert: {
                  publicId: image.publicId,
                  imageUrl: image.imageUrl,
                },
                $set: {
                  lastError: result.reason.message,
                  nextAttemptAt: new Date(),
                },
              },
              { upsert: true },
            );

            console.error(
              "Cloudinary cleanup failed and was queued:",
              image.publicId,
            );
          } catch (cleanupSaveError) {
            console.error(
              "Failed to save Cloudinary cleanup record:",
              cleanupSaveError.message,
            );
          }
        }
      }
    }

    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
      success: false,
    });
  } finally {
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

//delete property

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
      {
        new: true,
      },
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

    // Check active bookings
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

    // Collect all images requiring deletion
    const allImages = [...property.images, ...(property.cleanupImages || [])];

    const uniqueImages = [
      ...new Map(allImages.map((image) => [image.publicId, image])).values(),
    ];

    // Attempt Cloudinary deletion
    const results = await Promise.allSettled(
      uniqueImages.map((image) => deleteFromCloudinary(image.publicId)),
    );

    const failedImages = results
      .map((result, index) =>
        result.status === "rejected"
          ? {
              image: uniqueImages[index],
              error: result.reason,
            }
          : null,
      )
      .filter(Boolean);

    // Remove cleanup records for successfully deleted images
    const successfulIds = results
      .map((result, index) =>
        result.status === "fulfilled" ? uniqueImages[index].publicId : null,
      )
      .filter(Boolean);

    if (successfulIds.length > 0) {
      await CloudinaryCleanup.deleteMany({
        publicId: { $in: successfulIds },
      });
    }

    // Save failed deletions in centralized cleanup collection
    let cleanupSaveFailed = false;

    for (const item of failedImages) {
      try {
        await CloudinaryCleanup.updateOne(
          { publicId: item.image.publicId },
          {
            $setOnInsert: {
              publicId: item.image.publicId,
              imageUrl: item.image.imageUrl,
            },
            $set: {
              propertyId: property._id,
              lastError: item.error?.message || "Cloudinary deletion failed",
              nextAttemptAt: new Date(),
            },
          },
          { upsert: true },
        );
      } catch (error) {
        cleanupSaveFailed = true;

        console.error(
          "Failed to save cleanup record:",
          item.image.publicId,
          error.message,
        );
      }
    }

    // Preserve property before creating cleanup records
    if (failedImages.length > 0) {
      property.deletionPending = true;
      property.deletionState = "cleanup_pending";

      // Store every failed image as a fallback
      property.cleanupImages = failedImages.map((item) => item.image);

      // Save property first
      await property.save();

      // Clear fallback only when all cleanup records are saved
      if (!cleanupSaveFailed) {
        property.cleanupImages = [];
        await property.save();
      }

      return res.status(500).json({
        message:
          "Some images could not be deleted. Property was retained for cleanup retry.",
        success: false,
        failedDeletions: failedImages.length,
      });
    }

    // All images deleted successfully
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
      message: "Property and its images deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Delete Property Error:", error);

    return res.status(500).json({
      message: "Error deleting property",
      success: false,
    });
  } finally {
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

//admin approve property
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
      },
      {
        $set: { status: "available" },
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
    console.log("Approve Property Error", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

//reject property by admin

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
      },
      {
        $set: { status: "rejected" },
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
    console.log("Rejected Property Error", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

//viewing pending requests by admin

const getPendingProperties = async (req, res) => {
  try {
    const properties = await Property.find({
      status: "pending",
    })
      .populate("seller", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (err) {
    console.log("Getting Pending Properties Error", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// admin view all the property
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
    console.error("Admin Get All Properties Error", err);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

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
