const express = require("express");
const router = express.Router(); 

const {createBooking,
        verifyEsewaPayment,
        handleEsewaFailure, 
        getMyBookings, 
        getAllBookings, 
        updateAdminBookingStatus,
        getLatePaymentBookings,
        resolveLatePayment,
        getPendingRefunds,
        resolveRefund
    } = require("../controllers/bookingController");
const {authenticateUser, authorizeRoles} = require("../middleware/authMiddleware");

router.get(
    "/esewa/success",
    verifyEsewaPayment
)

router.get(
    "/esewa/failure",
    handleEsewaFailure
)

router.get(
    "/my-bookings",
    authenticateUser,
    authorizeRoles("customer"),
    getMyBookings
)

router.get(
    "/all",
    authenticateUser,
    authorizeRoles("admin"),
    getAllBookings
)

router.get(
    "/admin/pending-refunds",
    authenticateUser,
    authorizeRoles("admin"),
    getPendingRefunds
);

// Admin views late payment bookings
router.get(
  "/late-payments",
  authenticateUser,
  authorizeRoles("admin"),
  getLatePaymentBookings
);

router.patch(
    "/admin/resolve-refund/:id",
    authenticateUser,
    authorizeRoles("admin"),
    resolveRefund
);

// Admin resolves late payment
router.patch(
  "/:id/resolve-late-payment",
  authenticateUser,
  authorizeRoles("admin"),
  resolveLatePayment
);

//admin approves or rejects a booking
router.patch(
    "/:id/status",
    authenticateUser,
    authorizeRoles("admin"),
    updateAdminBookingStatus
)

//customer creates a booking
router.post(
    "/",
    authenticateUser,
    authorizeRoles("customer"),
    createBooking
);

module.exports = router;