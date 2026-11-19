require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserModel = require("./models/User");

const createAdmin = async () => {
  try {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } =
      process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !MONGODB_URI) {
      throw new Error("Please provide all credentials");
    }

    // connect to mongodb
    await mongoose.connect(MONGODB_URI);

    //allow only the first admin to be created this way
    const existingAdmin = await UserModel.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("An admin account is already registered");
      return;
    }

    //preventing duplicate email
    const existingUser = await UserModel.findOne({
      email: ADMIN_EMAIL.toLowerCase(),
    });

    if (existingUser) {
      console.log("This email is already registered. Use another email");
      return;
    }

    //hash the password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    //create admin account
    const admin = new UserModel({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();

    console.log("Admin account created successfully!");
  } catch (err) {
    console.error("Error creating admin account", err.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
