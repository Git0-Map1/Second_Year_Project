const joi = require('joi');

const signupValidation = (req,res,next)=>{
    //validation Schema
    const schema = joi.object({
        name: joi.string().min(3).max(100).required(),
        email: joi.string().email().required(),
        password: joi.string().min(8).max(100).required()
    });

    //this checks the incoming client request data with schema 
    const { error } = schema.validate(req.body);

    if(error){
        return res.status(400)
            .json({message: "Bad request", error})
    }
   
    // if there is no error in validation error,
    // it passes control to next middleware or route handler  
    next();
}

const loginValidation = (req,res,next)=>{
  
    const schema = joi.object({
        email: joi.string().email().required(),
        password: joi.string().min(8).max(100).required()
    });

    const { error } = schema.validate(req.body);

    if(error){
        return res.status(400)
            .json({message: "Bad request", error})
    }

    next();
}

module.exports = {
    signupValidation,
    loginValidation
}