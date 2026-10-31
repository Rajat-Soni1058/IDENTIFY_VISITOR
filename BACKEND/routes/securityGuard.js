const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");


const SecGaurd=require("../model/securityGaurdModel");
const Organization=require("../model/organizationModel");
const OrganizationGuard=require("../model/organizationGuardModel");
const {createGuardToken}=require("../services/createGuardToken");
const {checkValidGuard}=require("../middleware/checkValidGuard");




router.route("/signup").post(async (req, res) => {
  try {
    const {name,email,password,phoneNumber,address,age,gender,employeeId,organizationCode} = req.body;

    //Validate required fields
    if (!name || !email || !password || !phoneNumber || !address) {
      return res.status(400).json({
        message: "Please provide all required fields"
      });
    }

    //Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address"
      });
    }

    // Check whether email is already registered
    const existingGuard = await SecGaurd.findOne({
      email: email.trim().toLowerCase()
    });

    if (existingGuard) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

// Validate organization if provided // 
let organization = null;
if (organizationCode !== undefined && organizationCode !== null) {
  if (
    typeof organizationCode !== "string" ||
    !organizationCode.trim()
  ) {
    return res.status(400).json({
      message: "Please provide a valid organization code."
    });
  }

  // Find organization using organizationCode.
  organization = await Organization.findOne({organizationCode: organizationCode.trim().toUpperCase()});
  if (!organization) {
    return res.status(404).json({
      message: "Invalid organization code. Organization not found."
    });
  }
}

    // Hash password
    const hashedPassword = await bcrypt.hash(password,10);

    // Create guard account
    const guard = await SecGaurd.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      age,
      gender,
      employeeId,
      organizationCode
    });

    //Create pending organization membership
    if (organization) {
      await OrganizationGuard.create({
        guardId: guard._id,
        organizationId: organization._id,
        status: "pending"
      });
    }

    // Generate JWT
    const token = createGuardToken(guard._id);

    // Return response
    return res.status(201).json({
      message: organization
        ? "Signup successful. Waiting for organization approval."
        : "Signup successful.",
      token
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    console.error("Security guard signup error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

module.exports = router;