const express = require("express");
const router = express.Router();

const { getSellerBookings,updateBookingStatus} = require("../controllers/sellerBookingController");
const { authenticateUser, authorizeRoles} = require("../middleware/authMiddleware")

//view seller bookings
router.get(
    "/",
    authenticateUser,
    authorizeRoles("seller"),
    getSellerBookings
)

//update the booking status
router.patch(
    "/:id/status",
    authenticateUser,
    authorizeRoles("seller"),
    updateBookingStatus
)

module.exports = router;
