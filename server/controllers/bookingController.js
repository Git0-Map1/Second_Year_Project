const Booking = require("../models/Booking");
const Property = require("../models/Property");
const {
  generateEsewaSignature,
  verifyEsewaSignature,
} = require("../utils/esewa");
const crypto = require("crypto");
const mongoose = require("mongoose");

const createBooking = async (req, res) => {
  let lockedPropertyId = null;
  let createdBookingId = null;

  try {
    const {
      propertyId,
      fullName,
      citizenshipNumber,
      contactNumber,
      email,
      paymentMethod,
      permanentAddress,
    } = req.body;

    // Check required fields
    if (
      !propertyId ||
      !fullName ||
      !citizenshipNumber ||
      !contactNumber ||
      !email ||
      !paymentMethod ||
      !permanentAddress
    ) {
      return res.status(400).json({
        message: "All booking details are required",
        success: false,
      });
    }

    // Validate property ID
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        message: "Invalid Property Id",
        success: false,
      });
    }

    // Only eSewa is currently supported
    if (paymentMethod !== "esewa") {
      return res.status(400).json({
        message: "Currently only eSewa is supported",
        success: false,
      });
    }

    // Find property
    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
        success: false,
      });
    }

    if (
      property.deletionPending ||
      (property.deletionState && property.deletionState !== "active")
    ) {
      return res.status(400).json({
        message: "This property is being deleted and cannot be booked.",
        success: false,
      });
    }

    // Seller cannot book their own property
    if (property.seller.toString() === req.user._id.toString()) {
      return res.status(403).json({
        message: "You cannot book your own property",
        success: false,
      });
    }

    // Check duplicate booking
    const existingBooking = await Booking.findOne({
      customer: req.user._id,
      property: propertyId,
      bookingStatus: { $in: ["pending", "approved"] },
      paymentStatus: { $in: ["pending", "paid"] },
    });

    if (existingBooking) {
      return res.status(409).json({
        message:
          "You already have a pending or approved booking for this property",
        success: false,
      });
    }

    // Generate transaction UUID
    const transactionUuid = crypto.randomUUID();

    // Fixed booking fee
    const bookingFee = 10;

    // Generate eSewa signature
    const productCode = process.env.ESEWA_PRODUCT_CODE;

    const { signature, signedFieldNames } = generateEsewaSignature(
      String(bookingFee),
      transactionUuid,
      productCode,
    );

    // Prepare eSewa payment details
    const paymentData = {
      amount: String(bookingFee),
      tax_amount: "0",
      total_amount: String(bookingFee),
      transaction_uuid: transactionUuid,
      product_code: productCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: process.env.ESEWA_SUCCESS_URL,
      failure_url: `${process.env.ESEWA_FAILURE_URL}?transaction_uuid=${encodeURIComponent(transactionUuid)}`,
      signed_field_names: signedFieldNames,
      signature,
    };

    // ATOMIC PROPERTY LOCK
    const lockedProperty = await Property.findOneAndUpdate(
      {
        _id: propertyId,
        status: "available",
        deletionPending: { $ne: true },
        $or: [
          { deletionState: "active" },
          { deletionState: { $exists: false } },
        ],
      },
      {
        $set: { status: "booked" },
      },
      {
        new: true,
      },
    );

    if (!lockedProperty) {
      return res.status(409).json({
        message:
          "Sorry, this property has already been booked or is unavailable",
        success: false,
      });
    }

    lockedPropertyId = propertyId;

    // Create booking
    const booking = await Booking.create({
      customer: req.user._id,
      property: propertyId,
      fullName,
      citizenshipNumber,
      permanentAddress,
      contactNumber,
      email,
      bookingFee,
      paymentMethod,
      transactionUuid,
    });

    createdBookingId = booking._id;

    // Send payment information to frontend
    return res.status(201).json({
      message: "Booking created. Please complete your payment",
      success: true,
      bookingId: booking._id,
      paymentUrl: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
      paymentData,
    });
  } catch (err) {
    console.error("Booking Failed:", err);

    // If booking creation failed, release the property
    try {
      if (createdBookingId) {
        await Booking.updateOne(
          { _id: createdBookingId },
          {
            $set: {
              bookingStatus: "cancelled",
              paymentStatus: "failed",
            },
          },
        );
      }

      if (lockedPropertyId) {
        await Property.updateOne(
          {
            _id: lockedPropertyId,
            status: "booked",
          },
          {
            $set: { status: "available" },
          },
        );
      }
    } catch (cleanupError) {
      console.error("Booking cleanup failed:", cleanupError);
    }

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// internal helper function called directly by verifyEsewaPayment and handleEsewaFailure
const handleSuccessfulEsewaPayment = async (booking, verificationData) => {
  // Normal payment: booking has not expired or been cancelled.
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      bookingStatus: "pending",
      paymentStatus: "pending",
    },
    {
      $set: {
        paymentStatus: "paid",
        transactionId: verificationData.ref_id,
      },
    },
    { new: true },
  );

  if (updatedBooking) {
    return {
      success: true,
      latePayment: false,
      booking: updatedBooking,
    };
  }

  // Reload the latest booking in case cron or another callback changed it.
  const latestBooking = await Booking.findById(booking._id);

  if (!latestBooking) {
    return {
      success: false,
      message: "Booking not found.",
    };
  }

  // Already processed payment.
  if (latestBooking.paymentStatus === "paid") {
    return {
      success: true,
      latePayment: ["expired", "cancelled"].includes(
        latestBooking.bookingStatus,
      ),
      booking: latestBooking,
    };
  }

  // Late payment: record payment but preserve expired/cancelled status.
  if (
    ["expired", "cancelled"].includes(latestBooking.bookingStatus) &&
    latestBooking.paymentStatus === "pending"
  ) {
    const lateBooking = await Booking.findOneAndUpdate(
      {
        _id: latestBooking._id,
        bookingStatus: latestBooking.bookingStatus,
        paymentStatus: "pending",
      },
      {
        $set: {
          paymentStatus: "paid",
          transactionId: verificationData.ref_id,
          latePaymentReviewStatus: "pending",
          latePaymentResolution: null,
        },
      },
      { new: true },
    );

    if (lateBooking) {
      return {
        success: true,
        latePayment: true,
        booking: lateBooking,
      };
    }
  }

  return {
    success: false,
    message: "Booking status changed. Manual payment review is required.",
  };
};

const verifyEsewaPayment = async (req, res) => {
  try {
    // Receive encoded response from eSewa
    const encodedData = req.query.data;

    if (!encodedData) {
      return res.status(400).json({
        message: "Payment data is missing.",
        success: false,
      });
    }

    // Decode Base64 response
    let responseData;

    try {
      responseData = JSON.parse(
        Buffer.from(encodedData, "base64").toString("utf8"),
      );
    } catch (error) {
      return res.status(400).json({
        message: "Invalid payment response data.",
        success: false,
      });
    }

    // Verify eSewa response signature
    const isValid = verifyEsewaSignature(responseData);

    if (!isValid) {
      return res.status(400).json({
        message: "Invalid payment signature.",
        success: false,
      });
    }

    // Find booking using transaction UUID
    const booking = await Booking.findOne({
      transactionUuid: responseData.transaction_uuid,
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
        success: false,
      });
    }

    // Verify payment details against database
    if (
      responseData.product_code !== process.env.ESEWA_PRODUCT_CODE ||
      Number(responseData.total_amount) !== booking.bookingFee ||
      responseData.transaction_uuid !== booking.transactionUuid
    ) {
      return res.status(400).json({
        message: "Payment details do not match.",
        success: false,
      });
    }

    // Prevent duplicate payment processing
    if (booking.paymentStatus === "paid") {
      return res.status(200).json({
        message: "Payment already verified.",
        success: true,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
        latePayment: ["expired", "cancelled"].includes(booking.bookingStatus),
        booking,
      });
    }

    // Check transaction status directly with eSewa
    const statusUrl = new URL(
      "https://rc.esewa.com.np/api/epay/transaction/status/",
    );

    statusUrl.search = new URLSearchParams({
      product_code: process.env.ESEWA_PRODUCT_CODE,
      total_amount: String(booking.bookingFee),
      transaction_uuid: booking.transactionUuid,
    }).toString();

    const esewaResponse = await fetch(statusUrl.toString());
    const responseText = await esewaResponse.text();

    console.log("eSewa HTTP Status:", esewaResponse.status);
    console.log("eSewa Response:", responseText);

    if (!esewaResponse.ok) {
      throw new Error(
        `eSewa returned HTTP ${esewaResponse.status}: ${responseText}`,
      );
    }

    const verificationData = JSON.parse(responseText);

    console.log("eSewa Verification Data:", verificationData);

    // Verify transaction details returned by eSewa
    if (
      verificationData.transaction_uuid !== booking.transactionUuid ||
      verificationData.product_code !== process.env.ESEWA_PRODUCT_CODE ||
      Number(verificationData.total_amount) !== booking.bookingFee
    ) {
      return res.status(400).json({
        message: "eSewa transaction details do not match.",
        success: false,
      });
    }

    // Process payment only if eSewa confirms COMPLETE
    if (verificationData.status === "COMPLETE") {
      const paymentResult = await handleSuccessfulEsewaPayment(
        booking,
        verificationData,
      );

      if (!paymentResult.success) {
        return res.status(409).json({
          success: false,
          message: paymentResult.message,
        });
      }

      // return res.status(200).json({
      //   success: true,
      //   message: paymentResult.latePayment
      //     ? "Payment received after booking expiry. Manual review is required."
      //     : "Payment verified successfully.",
      //   paymentStatus: "paid",
      //   bookingStatus: paymentResult.booking.bookingStatus,
      //   latePayment: paymentResult.latePayment,
      //   booking: paymentResult.booking,
      // });

      return res.redirect(
        `http://localhost:5173/payment-success?latePayment=${paymentResult.latePayment}`,
      );
    }

    // Payment has not been confirmed
    return res.status(200).json({
      message: `Payment is not confirmed. Current status: ${verificationData.status}`,
      success: false,
      paymentStatus: verificationData.status,
    });
  } catch (err) {
    console.error("eSewa verification error:", err);

    return res.status(500).json({
      message: "Payment verification failed.",
      success: false,
    });
  }
};

const handleEsewaFailure = async (req, res) => {
  try {
    const encodedData = req.query.data;
    let transactionUuid;
    let responseData = null;

    // If eSewa sends signed response data, verify it
    if (encodedData) {
      try {
        responseData = JSON.parse(
          Buffer.from(encodedData, "base64").toString("utf8"),
        );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid eSewa response data.",
        });
      }

      const isValid = verifyEsewaSignature(responseData);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid eSewa payment signature.",
        });
      }

      transactionUuid = responseData.transaction_uuid;
    } else {
      // Use transaction UUID passed through failure_url
      transactionUuid = req.query.transaction_uuid;

      if (!transactionUuid) {
        return res.status(400).json({
          success: false,
          message: "Transaction UUID is missing.",
        });
      }
    }
    // Find booking
    const booking = await Booking.findOne({
      transactionUuid,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Verify payment details
    if (responseData) {
      if (
        responseData.product_code !== process.env.ESEWA_PRODUCT_CODE ||
        Number(responseData.total_amount) !== booking.bookingFee ||
        responseData.transaction_uuid !== booking.transactionUuid
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment details do not match.",
        });
      }
    }

    // Never process an already paid payment again
    if (booking.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment was already completed.",
        paymentStatus: "paid",
        bookingStatus: booking.bookingStatus,
        booking,
      });
    }

    // Check actual transaction status with eSewa
    const statusUrl = new URL(
      "https://rc.esewa.com.np/api/epay/transaction/status/",
    );

    statusUrl.search = new URLSearchParams({
      product_code: process.env.ESEWA_PRODUCT_CODE,
      total_amount: String(booking.bookingFee),
      transaction_uuid: booking.transactionUuid,
    }).toString();

    const esewaResponse = await fetch(statusUrl.toString());
    const responseText = await esewaResponse.text();

    if (!esewaResponse.ok) {
      throw new Error(
        `eSewa status check failed: ${esewaResponse.status}: ${responseText}`,
      );
    }

    const verificationData = JSON.parse(responseText);

    // Verify transaction details returned by eSewa
    if (
      verificationData.transaction_uuid !== booking.transactionUuid ||
      verificationData.product_code !== process.env.ESEWA_PRODUCT_CODE ||
      Number(verificationData.total_amount) !== booking.bookingFee
    ) {
      return res.status(400).json({
        success: false,
        message: "eSewa transaction details do not match.",
      });
    }

    // eSewa confirms successful payment
    if (verificationData.status === "COMPLETE") {
      const paymentResult = await handleSuccessfulEsewaPayment(
        booking,
        verificationData,
      );

      if (!paymentResult.success) {
        return res.status(409).json({
          success: false,
          message: paymentResult.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: paymentResult.latePayment
          ? "Payment received after booking expiry. Manual review is required."
          : "Payment was successfully completed.",
        paymentStatus: "paid",
        bookingStatus: paymentResult.booking.bookingStatus,
        latePayment: paymentResult.latePayment,
        booking: paymentResult.booking,
      });
    }

    // Explicit payment failure
    if (
      verificationData.status === "NOT_FOUND" ||
      verificationData.status === "CANCELED"
    ) {
      // Only cancel a booking that is still pending and unpaid
      const cancelledBooking = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          bookingStatus: "pending",
          paymentStatus: "pending",
        },
        {
          $set: {
            paymentStatus: "failed",
            bookingStatus: "cancelled",
          },
        },
        { new: true },
      );

      if (cancelledBooking) {
        // Release the property
        await Property.updateOne(
          {
            _id: booking.property,
            status: "booked",
          },
          {
            $set: { status: "available" },
          },
        );

        return res.redirect("http://localhost:5173/payment-failed");
      }

      // Reload in case another process changed the booking
      const latestBooking = await Booking.findById(booking._id);

      return res.status(200).json({
        success: latestBooking?.paymentStatus === "paid",
        message:
          "Booking status has already changed. No cancellation was applied.",
        paymentStatus: latestBooking?.paymentStatus,
        bookingStatus: latestBooking?.bookingStatus,
      });
    }

    // Keep booking pending for uncertain eSewa statuses
    return res.status(200).json({
      success: false,
      message: `Payment status: ${verificationData.status}`,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
    });
  } catch (err) {
    console.error("eSewa failure handling error:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to process payment failure.",
    });
  }
};

// only the customer who books can view the booked property
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      customer: req.user._id,
    })
      .select("-citizenshipNumber -permanentAddress")
      .populate("property")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: bookings.length,
      success: true,
      bookings,
    });
  } catch (err) {
    console.error("Get my booking errors: ", err);

    return res.status(500).json({
      message: "Server error while fetching bookings",
      success: false,
    });
  }
};

//admin get all the bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .select("-citizenshipNumber -permanentAddress")
      .populate("customer", "name email")
      .populate("property", "title price location listingType")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: bookings.length,
      success: true,
      bookings,
    });
  } catch (err) {
    console.error("Get All Bookings Error", err);

    return res.status(500).json({
      message: "Server error while fetching bookings",
      success: false,
    });
  }
};

const updateAdminBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid property id",
        success: false,
      });
    }

    if (!["approved", "rejected"].includes(bookingStatus)) {
      return res.status(400).json({
        message: "Booking Status must be approved or rejected",
        success: false,
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(400).json({
        message: " Booking not found",
        success: false,
      });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({
        message: "Only paid bookings can be managed",
        success: false,
      });
    }

    if (booking.bookingStatus !== "pending") {
      return res.status(400).json({
        message: "This booking has already been processed",
        success: false,
      });
    }

    booking.bookingStatus = bookingStatus;

    // If admin rejects a paid booking, refund is required
    if (bookingStatus === "rejected" && booking.paymentStatus === "paid") {
      booking.refundStatus = "pending";
    }

    await booking.save();

    if (bookingStatus === "rejected") {
      await Property.updateOne(
        {
          _id: booking.property,
          status: "booked",
        },
        {
          $set: { status: "available" },
        },
      );
    }

    return res.status(200).json({
      message: `Booking ${bookingStatus} successfully`,
      success: true,
      booking,
    });
  } catch (err) {
    console.error("Admin update booking error:", err);

    return res.status(500).json({
      message: "Server error while updating booking",
      success: false,
    });
  }
};

const getLatePaymentBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      paymentStatus: "paid",
      latePaymentReviewStatus: "pending",
    })
      .populate("customer", "name email")
      .populate("property", "title price location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: bookings.length,
      success: true,
      bookings,
    });
  } catch (err) {
    console.error("Get Late Payments Error:", err);

    return res.status(500).json({
      message: "Server error while fetching late payments",
      success: false,
    });
  }
};

const resolveLatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid booking id",
        success: false,
      });
    }

    if (!["refunded", "handed_manually"].includes(resolution)) {
      return res.status(400).json({
        message: "resolution must be refunded or handed_manually",
        success: false,
      });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: id,
        paymentStatus: "paid",
        latePaymentReviewStatus: "pending",
        bookingStatus: { $in: ["expired", "cancelled"] },
      },
      {
        $set: {
          latePaymentReviewStatus: "resolved",
          latePaymentResolution: resolution,
        },
      },

      { new: true },
    );

    if (!booking) {
      return res.status(404).json({
        message: "Late payment booking not found or already resolved",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Late Payment Resolved Successfully",
      success: true,
      booking,
    });
  } catch (err) {
    console.error("Resolve Late Payment Error: ", err);

    return res.status(500).json({
      message: "Server Error while resolving late payment",
      success: false,
    });
  }
};

const getPendingRefunds = async (req, res) => {
  try {
    const bookings = await Booking.find({
      bookingStatus: "rejected",
      paymentStatus: "paid",
      refundStatus: "pending",
    })
      .populate("customer", "name email")
      .populate("property", "title price location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    console.error("Get Pending Refunds Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching pending refunds",
    });
  }
};

const resolveRefund = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: id,
        bookingStatus: "rejected",
        paymentStatus: "paid",
        refundStatus: "pending",
      },
      {
        $set: {
          refundStatus: "refunded",
        },
      },
      { new: true },
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Pending refund booking not found or already resolved",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Refund marked as completed successfully",
      booking,
    });
  } catch (err) {
    console.error("Resolve Refund Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while resolving refund",
    });
  }
};

module.exports = {
  createBooking,
  verifyEsewaPayment,
  handleEsewaFailure,
  getMyBookings,
  getAllBookings,
  updateAdminBookingStatus,
  getLatePaymentBookings,
  resolveLatePayment,
  getPendingRefunds,
  resolveRefund,
};
