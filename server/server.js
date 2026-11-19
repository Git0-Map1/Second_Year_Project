const express = require("express");
const cors = require("cors");
const multer = require("multer");
require('dotenv').config();
require('./config/db');
const startBookingCron = require('./cron/bookingCron');
const startCloudinaryCleanupCron = require('./cron/cloudinaryCleanupCron');

const app = express();

const adminRoutes = require("./routes/adminRoutes")
const AuthRouter = require('./routes/authRoutes')
const SellerApplicationRoutes = require("./routes/sellerApplicationRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const BookingRoutes = require("./routes/bookingRoutes");
const sellerBookingRoutes = require("./routes/sellerBookingRoutes")

const port = process.env.PORT || 5000;

// middleware
app.use(cors()); //to allow request from your frontend
app.use(express.json()); //parsing incoming JSON requested bodies 

//routes
app.use('/auth', AuthRouter);
app.use("/api/seller-applications", SellerApplicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', BookingRoutes);
app.use('/api/seller-bookings', sellerBookingRoutes);

// app.get("/api/properties",(req,res)=>{
//     res.json([
//         {id:1, title: "House in Kathmandu"}
//     ])
// })

startBookingCron();
startCloudinaryCleanupCron();

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error("Server Error:", err.message);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            message: err.message,
            success: false,
        });
    }

    if (err.message === "Only JPEG, PNG and WEBP images are allowed") {
        return res.status(400).json({
            message: err.message,
            success: false,
        });
    }

    return res.status(500).json({
        message: "Internal Server Error",
        success: false,
    });
});

app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
})