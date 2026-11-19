const jwt = require("jsonwebtoken");

const authenticateUser = (req,res,next) =>{
    const authHeader = req.headers.authorization;

    //checking whether token is available not
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({
            message: "Access denied, please log in",
            success: false,
        })
    }
    
    //extracting the token 
    const token = authHeader.split(" ")[1];

    try{
        //verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // getting the value from the payloads
        req.user = {
            _id:  decoded._id,
            email:  decoded.email,
            role:  decoded.role
        };

        next();
    } catch(error){
        return res.status(401).json({
            message: "Invalid or Expired Token. Please Log In again",
            success: false
        })
    }
}

//role based authorization

const authorizeRoles = (...allowedRoles) =>{
    return(req,res,next) =>{
        if(!allowedRoles.includes(req.user.role)){
            return res.status(403).json({
                message: "Access Denied, You do not have permission.",
                success: false,
            })
        }

        next();
    }
}

module.exports = {
    authenticateUser,
    authorizeRoles
}