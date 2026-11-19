const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//creating the schema which is structure of database
const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true,
    },
    role:{
        type: String,
        //restrict a field 
        enum: ["customer", "seller", "admin"],
        default: "customer",
    }
},
    {timestamps: true}
)

// creates the users model 
const UserModel = mongoose.model('users', UserSchema);

//helps to reuse by other files 
module.exports= UserModel;