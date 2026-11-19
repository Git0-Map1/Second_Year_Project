const SellerApplication = require("../models/SellerApplication");
const UserModel = require("../models/User")


//getting all pending seller application 
const getSellerApplications = async(req,res)=>{
    try{
        const applications = await SellerApplication.find({
            status: "pending",
        })
        .populate("user", "name email")
        .sort({createdAt: -1});
        
        return res.status(200).json({
            success: true,
            applications,
        })
    } catch(error){
        console.error("get seller applications error:", error);

        return res.status(500).json({
            message: "Internal Server Error",
            success: false,
        })
    }
};

//Admin approves or rejects a seller application

const reviewSellerApplication = async (req, res) =>{
    try{
        const {status} = req.body;
        const {id} = req.params;

        //seller can only approved or reject application.
        if(!["approved", "rejected"].includes(status)){
            return res.status(400).json({
                message: "status must be approved or rejected",
                success: false,
            })
        }

        const application = await SellerApplication.findById(id);
        
        if(!application){
            return res.status(400).json({
                message: "application not found",
                success: false,
            })
        }

        if(application.status !== "pending"){
            return res.status(400).json({
                message:"This application has already been reviewed",
                success: false,
            })
        }

        const user = await UserModel.findById(application.user);

        if(!user){
            return res.status(400).json({
                message: "Applicant Account Not Found",
                success: false,
            })
        }

        if(status === "approved"){
            user.role = "seller",
            await user.save();
        }

        //update the status of application 
        application.status = status;
        await application.save();

        return res.status(200).json({
            message: `seller application ${status}`,
            success: true,
            application
        })
    } catch(err){
        console.error("Review Seller Application Error: ", err);

        return res.status(500).json({
            message: "Internal Server Error",
            success: false,
        })
    }
}

module.exports = {
    getSellerApplications,
    reviewSellerApplication,
}