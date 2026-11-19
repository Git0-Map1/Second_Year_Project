const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    propertyType: {
      type: String,
      enum: ["house", "land", "apartment", "commercial"],
      required: true,
    },
    listingType: {
      type: String,
      enum: ["sale", "rent"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
      required: true,
    },
    area: {
      type: Number,
      required: true,
      min: 0,
    },
    areaUnit: {
      type: String,
      enum: ["aana", "ropani", "sqft", "sqm", "dhur", "katha"],
      required: true,
    },
    bedrooms: {
      type: Number,
      default: 0,
    },
    bathrooms: {
      type: Number,
      default: 0,
    },
    images: [
      {
        imageUrl: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],

    cleanupImages: [
      {
        imageUrl: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        failedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    deletionPending: {
      type: Boolean,
      default: false,
    },

    deletionState: {
      type: String,
      enum: ["active", "updating", "deleting", "cleanup_pending"],
      default: "active",
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "sold", "booked", "rented", "pending", "rejected"],
      default: "pending",
    },
  },

  { timestamps: true, optimisticConcurrency: true },
);

module.exports = mongoose.model("Property", PropertySchema);
