
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
            required: true
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
            required: true,
            trim: true,
            lowercase: true
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

        gender: {
            type: String,
            trim: true
        },

        identityNumber: {
            type: String,
            select: false
        },
        activity: {
            type: [activitySchema],
            default: []
        }
    },
    { timestamps: true }
);

organizationVisitHistorySchema.index(
    { organizationId: 1,visitorId: 1,visitDate: 1},{ unique: true }
);

organizationVisitHistorySchema.index({
    organizationId: 1,
    visitDate: -1
});




const OrganizationVisitHistory = mongoose.model("OrganizationVisitHistory",organizationVisitHistorySchema);
module.exports = OrganizationVisitHistory;
