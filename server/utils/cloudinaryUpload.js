const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      return reject(new Error("Invalid image buffer"));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "PrimeEstate/properties",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result || !result.secure_url || !result.public_id) {
          return reject(new Error("Cloudinary upload failed"));
        }

        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    const readableStream = Readable.from([fileBuffer]);

    readableStream.on("error", (error) => {
      uploadStream.destroy(error);
      reject(error);
    });

    uploadStream.on("error", reject);

    readableStream.pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    throw new Error("Cloudinary publicId is missing");
  }

  if (
    process.env.SIMULATE_CLOUDINARY_DELETE_FAILURE === "true" &&
    publicId === "PrimeEstate/properties/jlhyc5bzphde9ogh4w1u"
  ) {
    throw new Error("Simulated Cloudinary deletion failure");
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    if (result.result === "ok") {
      return {
        success: true,
        message: "Image deleted successfully",
      };
    }

    if (result.result === "not found") {
      return {
        success: true,
        message: "Image was already deleted or not found",
      };
    }

    throw new Error(`Cloudinary deletion failed: ${result.result}`);
  } catch (error) {
    console.error("Cloudinary deletion error:", error.message);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
