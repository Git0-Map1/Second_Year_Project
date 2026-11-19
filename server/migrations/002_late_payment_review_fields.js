module.exports = {
  async up(db) {
    const bookings = db.collection("bookings");

    const result = await bookings.updateMany(
      {
        bookingStatus: { $in: ["expired", "cancelled"] },
        paymentStatus: "paid",
        latePaymentReviewStatus: { $exists: false },
      },
      {
        $set: {
          latePaymentReviewStatus: "pending",
          latePaymentResolution: null,
        },
      }
    );

    console.log(
      `Updated ${result.modifiedCount} late payment booking(s)`
    );
  },
};