const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    //customer who made the reservation
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    //property being reserved
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    //customer's full name
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    citizenshipNumber: {
      type: String,
      required: true,
      trim: true,
    },
    permanentAddress: {
      type: String,
      required: true,
      trim: true,
    },

    //fixed booking fee
    bookingFee: {
      type: Number,
      required: true,
      default: 10,
      enum: [10],
      immutable: true,
    },

    //selected payment provider
    paymentMethod: {
      type: String,
      enum: ["esewa", "khalti", "connectips"],
      required: true,
    },

    //booking status
    bookingStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "expired"],
      default: "pending",
    },

    //payment status
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    // Refund tracking
    refundStatus: {
      type: String,
      enum: ["not_required", "pending", "refunded"],
      default: "not_required",
    },

    latePaymentReviewStatus: {
      type: String,
      enum: ["not_required", "pending", "resolved"],
      default: "not_required",
    },

    latePaymentResolution: {
      type: String,
      enum: ["refunded", "handled_manually", null],
      default: null,
    },

    //payment provider's transaction reference
    transactionId: {
      type: String,
      default: null,
    },

    transactionUuid: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", BookingSchema);
