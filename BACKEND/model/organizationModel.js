const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false
    },

    organizationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    fullOrgName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    }
  },
  {
    timestamps: true
  }
);

const Organization = mongoose.model("Organization",organizationSchema);
module.exports = Organization;
