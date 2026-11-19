const mongoose = require("mongoose");

const CloudinaryCleanupSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },
    
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: null,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    lastError: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "manual_review"],
      default: "pending",
    },

    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("CloudinaryCleanup", CloudinaryCleanupSchema);
