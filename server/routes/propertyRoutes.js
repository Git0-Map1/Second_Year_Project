const router = require("express").Router();

const { createProperty, getAllProperties, getPropertyById, getMyProperties, updateProperty,
     deleteProperty, approveProperty, rejectProperty, getPendingProperties,
     getAllPropertiesForAdmin} = require("../controllers/propertyController");

const { authenticateUser, authorizeRoles} = require("../middleware/authMiddleware");

const { upload } = require("../config/multer");

//anyone can view properties
router.get(
    "/",
    getAllProperties
)

//seller views their own property
router.get(
    "/my-properties",
    authenticateUser,
    authorizeRoles("seller"),
    getMyProperties
)

//admin view the property
router.get(
    "/pending",
    authenticateUser,
    authorizeRoles("admin"),
    getPendingProperties
)

//anyone can view property by id
router.get(
    "/:id",
    getPropertyById
)

//admin view properties (status doesn't matter)
router.get(
    "/admin/all",
    authenticateUser,
    authorizeRoles("admin"),
    getAllPropertiesForAdmin
)

//only authenticated sellers can add properties
router.post(
    "/", 
    authenticateUser,
    authorizeRoles("seller"),
    upload.array("images",10),
    createProperty
);

// only sellers can update their own properties
router.patch(
    "/:id",
    authenticateUser,
    authorizeRoles("seller"),
    upload.array("images",10),
    updateProperty
)

//delete the property
router.delete(
    "/:id",
    authenticateUser,
    authorizeRoles("seller"),
    deleteProperty
)

// admin approve the property before listing
router.patch(
    "/:id/approve",
    authenticateUser,
    authorizeRoles("admin"),
    approveProperty
)

//admin reject the property
router.patch(
    "/:id/reject",
    authenticateUser,
    authorizeRoles("admin"),
    rejectProperty
)



module.exports = router;