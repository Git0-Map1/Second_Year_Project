const SellerApplication = require("../models/SellerApplication");

const applyForSeller = async(req,res)=>{
    try{
        const userId = req.user._id;

        const {phone, address, reason} = req.body

        const existingApplication = await SellerApplication.findOne({
            user: userId,
            status: "pending"
        })

        if(existingApplication){
            return res.status(409).json({
                message: "Application is already in pending",
                success: false,
            })
        }

        //create an application
        const application = new SellerApplication({
            user: userId,
            phone,
            address,
            reason
        }) 

        await application.save();

        return res.status(201).json({
            message: "Seller application submitted successfully",
            success: true,
        })
    } catch(error){
        return res.status(500).json({
            message: "Internal Server Error",
            success: false
        })
    }
}

module.exports = {
    applyForSeller
}