module.exports = {
  async up(db) {
    const bookings = db.collection("bookings");

    await bookings.updateMany(
      { status: "confirmed" },
      { $set: { status: "successful" } }
    );

    await bookings.updateMany(
      { status: "failed" },
      { $set: { status: "error" } }
    );

    console.log("Booking statuses updated!");
  }
};