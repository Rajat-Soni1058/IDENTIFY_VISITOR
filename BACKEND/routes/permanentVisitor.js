const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");


const Pvisitor = require("../model/permanentVisitorModel");
const {checkValidPvisitor}= require("../middleware/checkValidPVisitor")
const {createPvisitorToken}=require("../services/createPVisitorToken");



// route to signup for new pvisitor // ------->
router.route("/signup").post(async (req, res) => {
  
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

const visitorResponse = newPVisitor.toObject();
delete visitorResponse.password;
delete visitorResponse._id;
delete visitorResponse.suspiciousCount;

return res.status(201).json({
  message: "Signup successful",
  token,
  visitor: visitorResponse
});
  }
   catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
});


// Route for signin //--------------->
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
    });

    if (!visitor) {
      return res.status(401).json({
        error: "Invalid email "
      });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      visitor.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        error: " Invalid password "
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
    const visitorData = visitor.toObject();

    delete visitorData.password;
    delete visitorData._id;
    delete visitorData.suspiciousCount;

    return res.status(200).json({
      message: "Signin successful",
      token,
      visitor:visitorData
    });

  } catch (error) {
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});


// Update permanent visitor information
router.route("/updateinfo").put(checkValidPvisitor, async (req, res) => {
  try {
    const pvisitorId = req.pvisitor.id;
    const { name, email,address,age,gender,phoneNumber,identityNumber,purpose,oldPassword,newPassword
    } = req.body || {};

    //Prepare profile fields for update------>
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (address !== undefined) updateData.address = address;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (identityNumber !== undefined) updateData.identityNumber = identityNumber;
    if (purpose !== undefined) updateData.purpose = purpose;

    //Check whether a password change was requested---------->
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

      // Find the visitor
      const visitor = await Pvisitor.findById(pvisitorId);
      if (!visitor) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      // Verify the old password
      const isPasswordCorrect = await bcrypt.compare(
        oldPassword,
        visitor.password
      );

      if (!isPasswordCorrect) {
        return res.status(401).json({
          message: "Old password is incorrect. No information was updated."
        });
      }
      // Hash the new password
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    //Check whether there is anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No information provided for update"
      });
    }

    // Update the visitor information-------->
    const updatedVisitor = await Pvisitor.findByIdAndUpdate(
      pvisitorId,
      { $set: updateData },
      {
        returnDocument: "after",
        runValidators: true
      }
    ).select("-password -suspiciousCount -_id");

    // 5. Check whether the visitor exists
    if (!updatedVisitor) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // 6. Return the updated information
    return res.status(200).json({
      message: "Visitor information updated successfully",
      visitor: updatedVisitor
    });

  } catch (error) {
    console.error("Update visitor error:", {
    userId: req.pvisitor?.id,
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
      message: "Internal server error ,Please try after sometime"
    });
  }
});


// Route to delete the account----------->

router.route("/delete").delete(checkValidPvisitor, async (req, res) => {
  try {
    const pvisitorId = req.pvisitor.id;
    const { password } = req.body||{};

    if (!password) {
      return res.status(400).json({
        message: "Password is required to delete your account"
      });
    }
    // Find the visitor account ---------->
    const visitor = await Pvisitor.findById(pvisitorId);

    if (!visitor) {
      return res.status(404).json({
        message: "Visitor account not found"
      });
    }

    //Verify the password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      visitor.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Incorrect password"
      });
    }

    // Delete the account
    await Pvisitor.findByIdAndDelete(pvisitorId);

    // Send success response
    return res.status(200).json({
      message: "Visitor account deleted successfully"
    });

  } catch (error) {
    console.error("Account deletion error:", error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


module.exports = router;