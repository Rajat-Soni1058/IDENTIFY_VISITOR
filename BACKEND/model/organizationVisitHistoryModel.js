
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
    {
        purpose: {
            type: String,
            trim: true,
            maxlength: 200
        },

        vehicleNumber: {
            type: String,
            trim: true,
            uppercase: true,
            default: null
        },

        entryTime: {
            type: Date,
            default: null
        },

        exitTime: {
            type: Date,
            default: null
        }
    },
    { timestamps: false }
);


const organizationVisitHistorySchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },

        visitorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PermanentVisitor",
            default: null
        },

        visitDate: {
            type: String,
            required: true,
            immutable: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: null
        },

        phoneNumber: {
            type: String,
            required: true,
            trim: true
        },

        address: {
            type: String,
            trim: true
        },

        age: {
            type: Number,
            min: 1,
            max: 120
        },

        gender: {
            type: String,
            trim: true
        },

        identityNumber: {
            type: String,
            required: true,
            trim: true,
            select: false
        },

        activity: {
            type: [activitySchema],
            default: []
        }
    },
    { timestamps: true }
);


// Registered visitor: one document per organization per date
organizationVisitHistorySchema.index(
    {
        organizationId: 1,
        visitorId: 1,
        visitDate: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            visitorId: { $type: "objectId" }
        }
    }
);


// Organization-wise date history
organizationVisitHistorySchema.index({
    organizationId: 1,
    visitDate: -1
});


// Find temporary visitor's latest history
organizationVisitHistorySchema.index({
    organizationId: 1,
    visitorId: 1,
    identityNumber: 1,
    createdAt: -1,
    _id: -1
});


const OrganizationVisitHistory = mongoose.model(
    "OrganizationVisitHistory",
    organizationVisitHistorySchema
);

module.exports = OrganizationVisitHistory;
