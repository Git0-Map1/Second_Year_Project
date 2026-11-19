const router = require("express").Router();

const {getSellerApplications, reviewSellerApplication} = require("../controllers/adminController");

const {authenticateUser, authorizeRoles} = require("../middleware/authMiddleware");

// admin view pending selller application
router.get(
    "/seller-applications",
    authenticateUser,
    authorizeRoles("admin"),
    getSellerApplications
)

router.patch(
    "/seller-applications/:id",
    authenticateUser,
    authorizeRoles("admin"),
    reviewSellerApplication,
)

module.exports = router;