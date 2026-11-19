const cron = require("node-cron");
const Property = require("../models/Property");
const CloudinaryCleanup = require("../models/CloudinaryCleanup");
const { deleteFromCloudinary } = require("../utils/cloudinaryUpload");

let isRunning = false;

const startCloudinaryCleanupCron = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    if (isRunning) return;

    isRunning = true;

    try {
      console.log("Starting Cloudinary cleanup...");

      // STEP 1: Migrate legacy property cleanup images
      const propertiesWithLegacyImages = await Property.find({
        "cleanupImages.0": { $exists: true },
        deletionState: { $nin: ["updating", "deleting"] },
      });

      for (const property of propertiesWithLegacyImages) {
        const migratedIds = [];

        for (const image of property.cleanupImages) {
          try {
            await CloudinaryCleanup.updateOne(
              { publicId: image.publicId },
              {
                $setOnInsert: {
                  publicId: image.publicId,
                  imageUrl: image.imageUrl,
                },
                $set: {
                  propertyId: property._id,
                },
              },
              { upsert: true },
            );

            migratedIds.push(image.publicId);
          } catch (error) {
            console.error(
              `Failed to migrate cleanup image ${image.publicId}:`,
              error.message,
            );
          }
        }

        // Remove only successfully migrated images
        if (migratedIds.length > 0) {
          await Property.updateOne(
            {
              _id: property._id,
              deletionState: { $nin: ["updating", "deleting"] },
              cleanupImages: {
                $elemMatch: {
                  publicId: { $in: migratedIds },
                },
              },
            },
            {
              $pull: {
                cleanupImages: {
                  publicId: { $in: migratedIds },
                },
              },
            },
          );
        }
      }

      // STEP 2: Find cleanup records ready for retry
      const cleanupRecords = await CloudinaryCleanup.find({
        status: "pending",
        nextAttemptAt: { $lte: new Date() },
      });

      for (const record of cleanupRecords) {
        try {
          await deleteFromCloudinary(record.publicId);

          await CloudinaryCleanup.deleteOne({
            _id: record._id,
          });

          console.log(
            `Successfully cleaned up Cloudinary image: ${record.publicId}`,
          );
        } catch (error) {
          const attempts = (record.attempts || 0) + 1;

          // STEP 3: Stop after 10 failed attempts
          if (attempts >= 10) {
            await CloudinaryCleanup.updateOne(
              {
                _id: record._id,
                status: "pending",
              },
              {
                $set: {
                  attempts,
                  lastError: error.message,
                  status: "manual_review",
                },
              },
            );

            console.error(
              `Cloudinary cleanup reached 10 failed attempts. Manual review required for ${record.publicId}.`,
            );
          } else {
            // Exponential backoff: 1, 2, 4, 8, 16, 32, 60...
            const retryDelay = Math.min(2 ** (attempts - 1), 60);

            await CloudinaryCleanup.updateOne(
              {
                _id: record._id,
                status: "pending",
              },
              {
                $set: {
                  attempts,
                  lastError: error.message,
                  nextAttemptAt: new Date(Date.now() + retryDelay * 60 * 1000),
                },
              },
            );

            console.error(
              `Cloudinary cleanup failed for ${record.publicId}. Retry scheduled in ${retryDelay} minutes.`,
            );
          }
        }
      }

      // STEP 4: Find properties waiting for deletion
      const propertiesPendingDeletion = await Property.find({
        deletionPending: true,
        $or: [
          { deletionState: "cleanup_pending" },
          { deletionState: { $exists: false } },
        ],
      });

      for (const property of propertiesPendingDeletion) {
        // Never delete a property with remaining legacy images
        if (property.cleanupImages?.length > 0) {
          continue;
        }

        // Check whether any cleanup records still exist
        const remainingCleanup = await CloudinaryCleanup.exists({
          propertyId: property._id,
        });

        // Includes pending and manual_review records
        if (remainingCleanup) {
          continue;
        }

        // STEP 5: Permanently delete the property
        const deletionResult = await Property.deleteOne({
          _id: property._id,
          deletionPending: true,
          $and: [
            {
              $or: [
                { cleanupImages: { $exists: false } },
                { cleanupImages: { $size: 0 } },
              ],
            },
            {
              $or: [
                { deletionState: "cleanup_pending" },
                { deletionState: { $exists: false } },
              ],
            },
          ],
        });

        if (deletionResult.deletedCount === 1) {
          console.log(
            `Property ${property._id} permanently deleted after image cleanup.`,
          );
        } else {
          console.log(
            `Property ${property._id} was not deleted because its conditions no longer matched.`,
          );
        }
      }

      console.log("Cloudinary cleanup completed.");
    } catch (error) {
      console.error("Cloudinary cleanup cron error:", error);
    } finally {
      isRunning = false;
    }
  });

  console.log("Cloudinary cleanup cron started.");
};

module.exports = startCloudinaryCleanupCron;
