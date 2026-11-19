const router = require("express").Router();

const { applyForSeller } = require("../controllers/sellerApplicationController");
const { authenticateUser } = require("../middleware/authMiddleware");

router.post("/", 
    authenticateUser ,
    applyForSeller);

module.exports = router;