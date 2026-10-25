const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");


const Pvisitor = require("../model/permanentVisitorModel");
const {checkValidPvisitor}= require("../middleware/checkValidPVisitor")
const {createPvisitorToken}=require("../services/createPVisitorToken");



// route to signup for new pvisitor // ------->
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

const visitorResponse = newPVisitor.toObject();
delete visitorResponse.password;
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
    }).select("-password -suspiciousCount");

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


// Update permanent visitor information //----------->
router.route("/updateinfo").put(checkValidPvisitor, async (req, res) => {
  try {
    const pvisitorId = req.pvisitor.id;

    const {name,email,address,age,gender,phoneNumber,identityNumber,purpose,oldPassword,
      newPassword} = req.body;

    // Update only the fields provided by the frontend
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (identityNumber !== undefined) updateData.identityNumber = identityNumber;
    if (purpose !== undefined) updateData.purpose = purpose;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No information provided for update"
      });
    }

//code snippet will  handle password change --------->
if((newPassword!=undefined)&&(oldPassword!=undefined)&&(newPassword!=oldPassword)){

const visitor = await Pvisitor.findById(pvisitorId);
if (!visitor) {
return res.status(404).json({ message: "User not found"});
}

const isPasswordCorrect = await bcrypt.compare(oldPassword,visitor.password);
if (!isPasswordCorrect) {
        return res.status(401).json({
          message: "Old password is incorrect. No information was updated."
        });
}
updateData.password = await bcrypt.hash(newPassword, 10);

}
// update the visitor profile ----->
const updatedVisitor = await Pvisitor.findByIdAndUpdate(
  pvisitorId,
  { $set: updateData },
  {
    returnDocument: "after",
    runValidators: true
  }
).select("-password -suspiciousCount");

if(!updatedVisitor) {
      return res.status(404).json({
        message: "User not found"
      });
}

    return res.status(200).json({
      message: "Visitor information updated successfully",
      visitor: updatedVisitor
    });

  } catch (error) {
    return res.status(400).json({
      message: error.message
    });
  }
});

module.exports = router;