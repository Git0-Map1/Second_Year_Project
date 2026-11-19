
const cron = require("node-cron");
const Booking = require("../models/Booking");
const Property = require("../models/Property");

const releasePropertyIfNoActiveBooking = async (propertyId) => {
  // Check whether another active booking exists
  const activeBooking = await Booking.findOne({
    property: propertyId,
    $or: [
      {
        bookingStatus: "pending",
        paymentStatus: { $in: ["pending", "paid"] },
      },
      {
        bookingStatus: "approved",
        paymentStatus: "paid",
      },
    ],
  });

  if (activeBooking) {
    console.log(
      `Property ${propertyId} remains booked because another active booking exists.`
    );
    return;
  }

  // Release the property if no active booking exists
  const result = await Property.updateOne(
    {
      _id: propertyId,
      status: "booked",
    },
    {
      $set: { status: "available" },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Property ${propertyId} released successfully.`);
  }
};

const startBookingCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      // expire bookings after 15 minute
      const expiryTime = new Date(Date.now() - 15 * 60 * 1000);

      // Find unpaid pending bookings older than 15 minute
      const expiredBookings = await Booking.find({
        bookingStatus: "pending",
        paymentStatus: "pending",
        createdAt: { $lte: expiryTime },
      });

      // Expire each booking
      for (const booking of expiredBookings) {
        const updatedBooking = await Booking.findOneAndUpdate(
          {
            _id: booking._id,
            bookingStatus: "pending",
            paymentStatus: "pending",
            createdAt: { $lte: expiryTime },
          },
          {
            $set: { bookingStatus: "expired" },
          },
          {
            returnDocument: "after",
          }
        );

        if (updatedBooking) {
          console.log(`Booking ${booking._id} expired successfully.`);
        }
      }

      // Find properties associated with expired/cancelled unpaid bookings.
      // This also catches properties skipped during earlier cron executions.
      const propertyIds = await Booking.distinct("property", {
        bookingStatus: { $in: ["expired", "cancelled"] },
        paymentStatus: { $in: ["pending", "failed"] },
      });

      for (const propertyId of propertyIds) {
        await releasePropertyIfNoActiveBooking(propertyId);
      }
    } catch (error) {
      console.error("Booking Cron Error:", error);
    }
  });
};

module.exports = startBookingCron;


