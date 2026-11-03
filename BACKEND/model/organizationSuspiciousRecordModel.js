
const mongoose = require("mongoose");

const organizationSuspiciousRecordSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },

        visitorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PermanentVisitor",
            required: true
        },

        guardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SecurityGuard",
            required: true
        },

        attemptedActivity: {
            type: String,
            enum: ["entry", "exit"],
            required: true
        },

        previousActivity: {
            type: String,
            enum: ["entry", "exit"],
            required: true
        },

        conflictType: {
            type: String,
            enum: ["ENT", "EXT"],
            required: true
        },

        markedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

organizationSuspiciousRecordSchema.index({
    organizationId: 1,
    markedAt: -1
});

organizationSuspiciousRecordSchema.index({
    organizationId: 1,
    visitorId: 1,
    markedAt: -1
});

const OrganizationSuspiciousRecord = mongoose.model(
    "OrganizationSuspiciousRecord",
    organizationSuspiciousRecordSchema
);

module.exports = OrganizationSuspiciousRecord;
