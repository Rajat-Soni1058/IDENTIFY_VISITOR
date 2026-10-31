const mongoose = require("mongoose");

const securityGuardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    email: {
  type: String,
  required: true,
  trim: true,
  lowercase: true,
  unique: true,
  match: [
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    "Please enter a valid email address"
  ]
  },

    password: {
      type: String,
      required: true,
      select: false
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    address:{
        type:String,
        required:true,
        trim:true,
    },
    age: {
      type: Number,
      min: 1,
      max: 120
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"]
    },
    employeeId: {
      type: String,
      trim: true
    },
    organizationCode: {
      type: String,
      ref: "Organization",
      default: null
    }
  },
  {
    timestamps: true
  }
);

const SecurityGuard = mongoose.model("SecurityGuard",securityGuardSchema);

module.exports = SecurityGuard;