const express = require("express");
const router = express.Router();


const Organization = require("../model/organizationModel");
const OrganizationSuspiciousRecord=require("../model/organizationSuspiciousRecordModel");
const OrganizationGuard = require("../model/organizationGuardModel");
const OrganizationVisitHistory = require("../model/organizationVisitHistoryModel");
const {checkValidGuard}=require("../middleware/checkValidGuard");


// Route for search visitor history by date ------------->

router.route("/search_history").post(checkValidGuard, async (req, res) => {
    try {
        const { organizationCode, date } = req.body;

        // VALIDATE ORGANIZATION CODE
        if (typeof organizationCode !== "string" || !organizationCode.trim()) {
            return res.status(400).json({
                error: true,
                message: "Organization code is required."
            });
        }

        // VALIDATE DATE
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (typeof date !== "string" || !datePattern.test(date)) {
            return res.status(400).json({
                error: true,
                message: "Invalid date format. Use YYYY-MM-DD."
            });
        }

        const parsedDate = new Date(`${date}T00:00:00.000Z`);

        if ( Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
            return res.status(400).json({
                error: true,
                message: "Invalid calendar date."
            });
        }

        // GET AUTHENTICATED GUARD ID
        const guardId = req.gaurdID.id;

        if (!guardId) {
            return res.status(401).json({
                error: true,
                message: "Guard authentication required."
            });
        }

        // FIND ORGANIZATION
        const organization = await Organization.findOne({
            organizationCode: organizationCode.trim()
        }).select("_id").lean();

        if (!organization) {
            return res.status(404).json({
                error: true,
                message: "Organization not found."
            });
        }

        // VERIFY GUARD ACCESS
        const guardAccess = await OrganizationGuard.exists({
            guardId,
            organizationId: organization._id,
            status: "allowed"
        });

        if (!guardAccess) {
            return res.status(403).json({
                error: true,
                message: "You are not authorized to access this organization."
            });
        }

        // FETCH VISITOR HISTORY
        const records = await OrganizationVisitHistory.find({
            organizationId: organization._id,
            visitDate: date
        })
        .select("-_id name email phoneNumber address age gender identityNumber visitDate activity ")
        .sort({ createdAt: -1, _id: -1 })
        .lean();

        // CALCULATE SUMMARY
        let totalEntries = 0;
        let totalExits = 0;
        for (const record of records) {
            for (const activity of record.activity || []) {
                if (activity.entryTime !== null && activity.entryTime !== undefined) {
                    totalEntries++;
                }
                if (activity.exitTime !== null && activity.exitTime !== undefined) {
                    totalExits++;
                }
            }
        }
        
        const summary = {
            totalVisitors: records.length,
            totalEntries,
            totalExits
        };

        // ADD VISITOR TYPE
        const visitorRecords = records.map(record => ({
            ...record,
            visitorType: record.visitorId ? "APP_VISITOR" : "NON_APP_VISITOR"
        }));

        return res.status(200).json({
        error: false,
        message: records.length ? "Visitor history fetched successfully." : "No visitor records found.",
        date,
        summary,
        records: visitorRecords
        });

    } catch (error) {
        console.error("Search visitor history error:", error);

        return res.status(500).json({
            error: true,
            message: "Internal server error."
        });
    }
});

//Route for fetching all suspicious visitors in an organization ---------->

router.route("/suspicious_visitors").post(checkValidGuard, async (req, res) => {
    try {
        const { organizationCode } = req.body;

        // VALIDATE ORGANIZATION CODE
        if (typeof organizationCode !== "string" || !organizationCode.trim()) {
            return res.status(400).json({
                error: true,
                message: "Organization code is required."
            });
        }

        // GET AUTHENTICATED GUARD ID
        const guardId = req.gaurdID.id;

        if (!guardId) {
            return res.status(401).json({
                error: true,
                message: "Guard authentication required."
            });
        }

        // FIND ORGANIZATION
        const organization = await Organization.findOne({
            organizationCode: organizationCode.trim()
        }).select("_id").lean();

        if (!organization) {
            return res.status(404).json({
                error: true,
                message: "Organization not found."
            });
        }

        // VERIFY GUARD ACCESS
        const guardAccess = await OrganizationGuard.exists({
            guardId,
            organizationId: organization._id,
            status: "allowed"
        });

        if (!guardAccess) {
            return res.status(403).json({
                error: true,
                message: "You are not authorized to access this organization."
            });
        }

        // FETCH SUSPICIOUS RECORDS WITH VISITOR AND GUARD DETAILS
        const records = await OrganizationSuspiciousRecord.find({
            organizationId: organization._id
        })
        .select("visitorId guardId attemptedActivity previousActivity markedAt -_id"
        )
        .populate({
            path: "visitorId",
            select: "name age address +identityNumber phoneNumber email -_id"
        })
        .populate({
            path: "guardId",
            select: "name phoneNumber identityNumber address -_id"
        })
        .sort({ markedAt: -1 })
        .lean();

        // FORMAT RESPONSE WITHOUT INTERNAL IDs
        const suspiciousVisitors = records.map(record => ({
            visitor: record.visitorId,
            guard: record.guardId,
            attemptedActivity: record.attemptedActivity,
            previousActivity: record.previousActivity,
            conflictType: record.conflictType,
            markedAt: record.markedAt
        }));

        return res.status(200).json({
            error: false,
            message: suspiciousVisitors.length
                ? "Suspicious visitors fetched successfully."
                : "No suspicious visitors found.",
            totalRecords: suspiciousVisitors.length,
            records: suspiciousVisitors
        });

    } catch (error) {
        console.error("Fetch suspicious visitors error:", error);
        return res.status(500).json({
            error: true,
            message: "Internal server error."
        });
    }
});


module.exports = router;
