const mongoose = require("mongoose");

const organizationGuardSchema = new mongoose.Schema(
  {
    guardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecurityGuard",
      required: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "allowed", "rejected", "revoked"],
      default: "pending",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate relationships between the same guard and organization.
organizationGuardSchema.index(
  { guardId: 1, organizationId: 1 },
  { unique: true }
);

const OrganizationGuard = mongoose.model("OrganizationGuard",organizationGuardSchema);

module.exports = OrganizationGuard;
