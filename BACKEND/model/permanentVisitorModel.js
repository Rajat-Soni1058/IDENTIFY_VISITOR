const mongoose = require("mongoose");

const permanentVisitorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
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
   password:{
        type:String,
        required:true,
    },
    address: {
      type: String,
      required:true,
      trim: true
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

    phoneNumber: {
      type: String,
      required:true,
      trim: true
    },
    identityNumber: {
      type: String,
      trim: true,
      required:true,
    },

    purpose: {
      type: String,
      trim: true,
       maxlength: 200
    },
   suspiciousCount: {
  type: Number,
  default: 0,
  min: 0
},
isBlocked: {
  type: Boolean,
  default: false
}
  },
  
  {
    timestamps: true
  }
);
const Pvisitor=mongoose.model("PermanentVisitor", permanentVisitorSchema);
module.exports = Pvisitor;