const Booking = require("../models/Booking");
const Property = require("../models/Property");

// Get bookings for the logged-in seller's properties
const getSellerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      paymentStatus: "paid",
    })
      .select("-citizenshipNumber -permanentAddress")
      .populate({
        path: "property",
        match: { seller: req.user._id },
        select: "title price location propertyType listingType images",
      })
      .sort({ createdAt: -1 });

    // Remove bookings belonging to other sellers
    const sellerBookings = bookings.filter(
      (booking) => booking.property !== null,
    );

    return res.status(200).json({
      success: true,
      count: sellerBookings.length,
      bookings: sellerBookings,
    });
  } catch (err) {
    console.error("Get Seller Bookings Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching seller bookings",
    });
  }
};

// Seller approves or rejects a booking
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingStatus } = req.body;

    // Validate booking ID
    const mongoose = require("mongoose");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // Validate requested status
    if (!["approved", "rejected"].includes(bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: "Booking status must be approved or rejected",
      });
    }

    // Find booking and its property
    const booking = await Booking.findById(id).populate(
      "property",
      "seller title",
    );

    if (!booking || !booking.property) {
      return res.status(404).json({
        success: false,
        message: "Booking or property not found",
      });
    }

    // Check property ownership
    if (booking.property.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to manage this booking",
      });
    }

    // Only paid bookings can be managed
    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot manage a booking without successful payment",
      });
    }

    // Only pending bookings can be updated
    if (booking.bookingStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This booking has already been processed",
      });
    }

    // Update booking status
    booking.bookingStatus = bookingStatus;

    await booking.save();


    //Release property if booking is rejected
    if(bookingStatus === "rejected"){
      await Property.updateOne(
        {
        _id: booking.property._id,
        status: "booked"
        },
        {
          $set: {
            status: "available"
          }
        }
    )
    }

    return res.status(200).json({
      success: true,
      message: `Booking ${bookingStatus} successfully`,
      booking,
    });
    
  } catch (err) {
    console.error("Update Booking Status Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while updating booking status",
    });
  }
};

module.exports = {
  getSellerBookings,
  updateBookingStatus,
};
