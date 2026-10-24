const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");


const Pvisitor = require("../model/permanentVisitorModel");
const {checkValidPvisitor}= require("../middleware/checkValidPVisitor")
const {createPvisitorToken}=require("../services/createPVisitorToken");



// route to signup for new pvisitor------->
router.route("/signup").post(async (req, res) => {
    console.log("signup ho gya ladle");
  try {
    const {
      name,
      password,
      email,
      address,
      age,
      gender,
      phoneNumber,
      identityNumber,
      purpose
    } = req.body;

    // Check required fields
    if (!name || !email || !password ||!identityNumber) {
      return res.status(400).json({
        error: "Name, email, and password are required"
      });
    }

    // Check if user already exists
    const visitor = await Pvisitor.findOne({ email });

    if (visitor) {
      return res.status(400).json({
        error: "User already exists"
      });
    }

    // Hash password
    const hashedpassword = await bcrypt.hash(password, 10);

    // Create new permanent visitor
    const newPVisitor = await Pvisitor.create({
      name,
      email,
      password: hashedpassword,
      address,
      age,
      gender,
      phoneNumber,
      identityNumber,
      purpose
    });

    // Generate JWT
    const token = createPvisitorToken(newPVisitor);

    return res.status(201).json({
      message: "Visitor registered successfully",
      token
    });

  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
});


// Route for signin--------------->
router.route("/signin").post(async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        error: "Email or password is required"
      });
    }

    // Find visitor by email
    const visitor = await Pvisitor.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!visitor) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      visitor.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        error: "Invalid password"
      });
    }

    // Check whether account is blocked
    if (visitor.isBlocked) {
      return res.status(403).json({
        error: "Your account is blocked"
      });
    }

    // Generate JWT
    const token = createPvisitorToken(visitor);

    return res.status(200).json({
      message: "Signin successful",
      token,visitor
    });

  } catch (error) {
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;