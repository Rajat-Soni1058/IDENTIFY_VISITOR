const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");


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

    const guardData = guard.toObject();
  delete guardData.password;
  delete guardData._id;


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
       guard: guardData,
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


// Sign in for the security guard  -------------->
router.route("/signin").post(async (req, res) => {
  try {
    const { email, password } = req.body;

    //  Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password"
      });
    }

    // Find guard using email
    const guard = await SecGaurd.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!guard) {
      return res.status(401).json({
        message: "Invalid email "
      });
    }

    // Compare entered password with hashed password
    const isPasswordValid = await bcrypt.compare(password,guard.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password"
      });
    }

    // Generate JWT
    const token = createGuardToken(guard._id);

   // remove the password from object 
  const guardData = guard.toObject();
  delete guardData.password;
  delete guardData._id;

    //  Return successful response
    return res.status(200).json({
      message: "Signin successful",
     token,
    guard: guardData
   });

  } catch (error) {
    console.error("Security guard signin error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


// Update security guard information ------------>
router.route("/updateInfo").put(checkValidGuard, async (req, res) => {
  try {
    const guardId = req.gaurdID.id;
    const { name,email,address,age,gender,phoneNumber,employeeId,oldPassword,newPassword} = req.body || {};

    // Prepare fields for update
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (address !== undefined) updateData.address = address;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (employeeId !== undefined) updateData.employeeId = employeeId;

    // Check whether an email change was requested
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (typeof email !== "string" || !emailRegex.test(email.trim())) {
        return res.status(400).json({
          message: "Please enter a valid email address"
        });
      }
    }

    // Check whether a password change was requested
    const changingPassword = oldPassword !== undefined || newPassword !== undefined;

    if (changingPassword) {
      // Both passwords are required
      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          message: "Both old password and new password are required"
        });
      }

      // New password must differ from the old password
      if (oldPassword === newPassword) {
        return res.status(400).json({
          message: "New password must be different from the old password"
        });
      }

      // Find the guard
      const guard = await SecGaurd.findById(guardId).select("+password");

      if (!guard) {
        return res.status(404).json({
          message: "Security guard not found"
        });
      }

      // Verify the old password
      const isPasswordCorrect = await bcrypt.compare(
        oldPassword,
        guard.password
      );

      if (!isPasswordCorrect) {
        return res.status(401).json({
          message: "Old password is incorrect. No information was updated."
        });
      }
      // Hash the new password
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Check whether there is anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No information provided for update"
      });
    }

    // Update guard information
    const updatedGuard = await SecGaurd.findByIdAndUpdate(
      guardId,
      { $set: updateData },
      {
        returnDocument: "after",
        runValidators: true
      }
    ).select("-password -_id");

    // Check whether the guard exists
    if (!updatedGuard) {
      return res.status(404).json({
        message: "Security guard not found"
      });
    }

    // Return updated information
    return res.status(200).json({
      message: "Security guard information updated successfully",
      guard: updatedGuard
    });

  } catch (error) {
    console.error("Update security guard error:", {
      guardId: req.gaurdID?.id,
      errorMessage: error.message,
      errorCode: error.code,
      errorName: error.name,
      timestamp: new Date().toISOString()
    });

    // Handle duplicate email errors
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email address is already registered"
      });
    }

    // Handle Mongoose validation errors
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Internal server error. Please try again later."
    });
  }
});


// Update guard organization information ----------->
router.route("/updateOrganizationInfo").put(checkValidGuard, async (req, res) => {
  let session;

  try {
    const guardId = req.gaurdID.id;

    const{ organizationCode,employeeId,currentPassword} = req.body || {};

    // Validate that at least one field is provided
    if (organizationCode === undefined && employeeId === undefined) {
      return res.status(400).json({
        message: "No information provided for update"
      });
    }

    // Validate current password
    if ( typeof currentPassword !== "string" ||!currentPassword ) {
      return res.status(400).json({
        message: "Current password is required"
      });
    }

    // Validate organization code before database operations
    let normalizedCode;

    if (organizationCode !== undefined) {
      if (typeof organizationCode !== "string" ||!organizationCode.trim()
      ){
        return res.status(400).json({
          message: "Please provide a valid organization code"
        });
      }

      normalizedCode = organizationCode.trim().toUpperCase();
    }

    // Find guard and retrieve password
    const guard = await SecGaurd.findById(guardId).select("+password");

    if (!guard) {
      return res.status(404).json({
        message: "Security guard not found"
      });
    }

    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword,guard.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Current password is incorrect"
      });
    }

    //  Prepare profile updates
    const updateData = {};

    if (employeeId !== undefined) {updateData.employeeId = employeeId;}

    // Start MongoDB transaction
    session = await mongoose.startSession();

    let updatedGuard;

    await session.withTransaction(async () => {

      // Check organization and create membership only when requested
    if (normalizedCode !== undefined) {
        // Find organization using its human-readable code
      const organization = await Organization.findOne({organizationCode: normalizedCode}).session(session);

        if (!organization) {
          const error = new Error(
            "Organization not found. Please check the organization code."
          );
          error.status = 404;
          throw error;
        }

        // Create a pending membership request.
        // The unique compound index prevents duplicate relationships.
        await OrganizationGuard.create(
          [{
            guardId: guard._id,
            organizationId: organization._id,
            status: "pending"
          }],
          { session }
        );

        // Store the human-readable code in the guard profile
        updateData.organizationCode = normalizedCode;
      }

      // Update guard profile in the same transaction
      updatedGuard = await SecGaurd.findByIdAndUpdate(
        guardId,
        { $set: updateData },
        {
          returnDocument: "after",
          runValidators: true,
          session
        }
      ).select("-password -_id");

      if (!updatedGuard) {
        const error = new Error("Security guard not found");
        error.status = 404;
        throw error;
      }
    });


    //  Return successful response after transaction commits
    return res.status(200).json({
      message: normalizedCode !== undefined 
      ? "Organization request submitted successfully. Awaiting approval."
        : "Employee ID updated successfully.",
      guard: updatedGuard
    });

  } catch (error) {
    console.error("Update guard organization information error:", {
      guardId: req.gaurdID?.id,
      errorCode: error.code,
      errorName: error.name,
      timestamp: new Date().toISOString()
    });

    // Duplicate membership or unique-index errors
    if (error.code === 11000) {
      return res.status(409).json({
        message:"A membership relationship already exists for this organization. If your request has not been approved, contact the organization."
      });
    }

    // Custom route errors
    if (error.status) {
      return res.status(error.status).json({
        message: error.message
      });
    }

    // Mongoose validation errors
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Internal server error. Please try again later."
    });

  } finally {
    // Always release the database session
    if (session) {
      await session.endSession();
    }
  }
});

// Delete guard account ------------------>
router.delete("/delete", checkValidGuard, async (req, res) => {
  let session;

  try {
    const guardId = req.gaurdID.id;
    const { currentPassword } = req.body || {};

    // Validate password
    if (typeof currentPassword !== "string" ||!currentPassword.trim()) {
      return res.status(400).json({
        message: "Current password is required"
      });
    }

    // Find guard and retrieve password hash
    const guard = await SecGaurd.findById(guardId).select("+password");
    if (!guard) {
      return res.status(404).json({
        message: "Guard not found"
      });
    }
    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword,guard.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Incorrect password"
      });
    }

    // Start transaction
    session = await mongoose.startSession();

    await session.withTransaction(async () => {

    // Delete guard profile
    const deletedGuard = await SecGaurd.findByIdAndDelete(guardId,{ session });

      if (!deletedGuard) {
        const error = new Error("Guard not found");
        error.status = 404;
        throw error;
      }
      // Delete all organization relationships
    await OrganizationGuard.deleteMany({ guardId: deletedGuard._id },{ session });
    });

    return res.status(200).json({
      message: "Guard account deleted successfully"
    });

  } catch (error) {
    console.error("Guard deletion error:", error);

    if (error.status === 404) {
      return res.status(404).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Failed to delete guard account"
    });

  } 
  finally {
    if (session) {
      await session.endSession();
    }
  }
});

module.exports = router;