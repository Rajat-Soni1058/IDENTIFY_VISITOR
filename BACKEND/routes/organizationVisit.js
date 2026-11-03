const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const SecGaurd = require("../model/securityGaurdModel");
const Organization = require("../model/organizationModel");
const PermanentVisitor = require("../model/permanentVisitorModel");
const OrganizationGuard = require("../model/organizationGuardModel");
const OrganizationVisitHistory = require("../model/organizationVisitHistoryModel");
const {checkValidGuard}=require("../middleware/checkValidGuard");
const OrganizationSuspiciousRecord = require("../model/organizationSuspiciousRecordModel");


//function to get  the time -------->
function getVisitDate(timeZone = "Asia/Kolkata") {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const dateParts = {};

    parts.forEach((part) => {
        dateParts[part.type] = part.value;
    });

    return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

// Route for scanning visitor QR
router.route("/scanVisitor").post(checkValidGuard, async (req, res) => {
try {

    // VALIDATE REQUEST DATA
    const guardId = req.gaurdID.id;

   const { visitorId, activity, organizationCode, timestamp } = req.body || {};

   // check the expiry of qr
   const QR_VALIDITY_MS = 3 * 60 * 1000; // 3 minutes
   const MAX_CLOCK_SKEW_MS = 3 * 60 * 1000;   // 3 minutes 

    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return res.status(400).json({
        message: "Invalid QR timestamp."
    });
  }
    const currentTime = Date.now();
    const qrAge = currentTime - timestamp;

   if (qrAge > QR_VALIDITY_MS || qrAge < -MAX_CLOCK_SKEW_MS) {
    return res.status(410).json({
        message: "This QR code has expired. Ask the visitor to generate a new QR code."
    });
  }


    if (!mongoose.isValidObjectId(guardId)) {
            return res.status(401).json({
                 error: true,
                message: "Invalid guard authentication"
            });
    }

    if (typeof visitorId !== "string" || !mongoose.isValidObjectId(visitorId)) {
            return res.status(400).json({
                 error: true,
                message: "Invalid QR"
            });
        }

    if(typeof activity !== "string" || !["entry", "exit"].includes(activity.trim().toLowerCase())) {
            return res.status(400).json({
                 error: true,
                message: "Activity must be entry or exit"
            });
        }

        const currentActivity = activity.trim().toLowerCase();

        // 2. GET ORGANIZATION CODE

        let selectedOrganizationCode;

        if (organizationCode !== undefined){
            if (typeof organizationCode !== "string" || !organizationCode.trim()) {
                return res.status(400).json({
                     error: true,
                    message: "Invalid organization code"
                });
            }

            selectedOrganizationCode = organizationCode.trim().toUpperCase();
        } 
        else {
           return res.status(403).json({
             error: true,
           message: "You have not joined any organization. You cannot scan visitors."
           });
        }

        // 3. FIND ORGANIZATION

        const organization = await Organization.findOne({organizationCode: selectedOrganizationCode}).select("_id organizationCode").lean();

        if (!organization) {
            return res.status(404).json({
                 error: true,
                message: "Organization not found. Please check organization code."
            });
        }

        const selectedOrganizationId = organization._id;

        // 4. VERIFY GUARD AUTHORIZATION

        const membership = await OrganizationGuard.findOne({
            guardId,
            organizationId: selectedOrganizationId,
            status: "allowed"
        }).select("_id").lean();

        if (!membership) { 
            return res.status(403).json({
                 error: true,
                message: "You are not authorized to access this organization"
            });
        }

        // 5.FETCH PERMANENT VISITOR

        const visitor = await PermanentVisitor.findById(visitorId)
            .select("name email phoneNumber address age gender purpose isBlocked identityNumber").lean();

        if (!visitor) {
            return res.status(404).json({
                 error: true,
                message: "Visitor account not found"
            });
        }

        if (visitor.isBlocked) {
            return res.status(403).json({
                 error: true,
                message: "This visitor is blocked due to suspicious activity"
            });
        }

        // 6. PREPARE VISITOR INFORMATION
        const visitorInfo = {
            visitorId: visitor._id,
            name: visitor.name,
            email: visitor.email,
            phoneNumber: visitor.phoneNumber,
            address: visitor.address,
            age: visitor.age,
            gender: visitor.gender,
            identityNumber: visitor.identityNumber,
            purpose: visitor.purpose || "",
            vehicleNumber: ""
        };

        // 7. GET TODAY'S HISTORY
        const visitDate = getVisitDate("Asia/Kolkata");

        const todayHistory = await OrganizationVisitHistory.findOne({
            organizationId: selectedOrganizationId,
            visitorId: visitor._id,
            visitDate
        }).select("_id visitDate activity name email phoneNumber address gender +identityNumber").lean();

        // 8. IF TODAY'S DOCUMENT IS ABSENT,
        //  FIND MOST RECENT PREVIOUS HISTORY

        let relevantHistory = todayHistory;

        if (!todayHistory) {

            relevantHistory = await OrganizationVisitHistory.findOne({
                organizationId: selectedOrganizationId,
                visitorId: visitor._id,
                visitDate: { $lt: visitDate },
                "activity.0": { $exists: true }
            }).sort({ visitDate: -1 }).select("_id visitDate activity name email phoneNumber address gender +identityNumber").lean();

        }

        // 9. CHECK HISTORY CONSISTENCY
        const activities = relevantHistory?.activity || [];

        // Your API should always create a document
        // with at least one activity.
        if (todayHistory && activities.length === 0) {
            return res.status(409).json({
                error: true,
                message: "Today's visitor history is inconsistent. Please contact support."
            });
        }

        // 10. GET ONLY THE LAST ACTIVITY
        const previousActivity = activities.length > 0? activities[activities.length - 1]: null;

        // 11. VALIDATE LAST ACTIVITY
        if (previousActivity &&previousActivity.entryTime == null && previousActivity.exitTime == null) {
            return res.status(409).json({
                error: true,
                message: "Invalid visitor activity record. Please contact support."
            });
        }

        // 12. DETERMINE PREVIOUS ACTIVITY TYPE
    const lastActivityType = previousActivity? (previousActivity.exitTime == null? "entry": "exit" ): null;

        // 13. DETERMINE VISIT STATE
          const visitState = todayHistory? "VISITED_TODAY": relevantHistory? "VISITED_BEFORE": "FIRST_VISIT";

        // 14. DETERMINE CONFLICT TYPE
        let conflictType = "NOR";

        if (previousActivity && currentActivity === lastActivityType) {
            conflictType = currentActivity === "entry"? "ENT": "EXT";
        }

        // 15. FIRST VISIT: NO PREVIOUS HISTORY
        if (!previousActivity) {
            // FIRST VISIT + ENTRY
            // Show the normal visitor form.
            if (currentActivity === "entry") {
                return res.status(200).json({
                    outcome: "ENTRY_FORM_REQUIRED",
                    conflictType: "NOR",
                    visitState,
                    message: "CrossCheck Visitor Information And Record Entry",
                    visitor: visitorInfo,
                    editableFields: ["purpose","vehicleNumber"]
                });
            }

            // FIRST VISIT + EXIT
            // Save unmatched exit automatically.
            const now = new Date();
            const savedHistory = await OrganizationVisitHistory.create({
                organizationId: selectedOrganizationId,
                visitorId: visitor._id,
                visitDate,

                name: visitor.name,
                email: visitor.email,
                phoneNumber: visitor.phoneNumber,
                address: visitor.address,
                gender: visitor.gender,
                identityNumber: visitor.identityNumber,

                activity: [
                    {
                        purpose: visitor.purpose || null,
                        vehicleNumber: null,
                        entryTime: null,
                        exitTime: now
                    }
                ]
            });

            return res.status(200).json({
                outcome: "EXIT SUCCESSFULL",
                conflictType: "NOR",
                visitState,
                message: "Visitor Exit Recorded SuccessFully",
                visitor: {
                    name: visitor.name
                },
                exitTime: now,
                visitDate
            });
        }

        // 16. CONFLICT DETECTED
        if (conflictType !== "NOR") {
            // Do not modify visitor history here.
            // Frontend will show the appropriate form
            // or suspicious handling options.
            console.log(visitor);
            console.log({
            identityNumber: visitor.identityNumber,
            address: visitor.address,
            age: visitor.age,
            gender: visitor.gender
        });
            return res.status(200).json({
                outcome: "SUSPICIOUS_SCAN",
                conflictType,
                visitState,
                message: conflictType === "ENT"? "Visitor's Previous Activity Was Also Entry.": "Visitor's Previous Activity Was Also Exit.",
                visitor: visitorInfo,
                previousActivity: {
                    purpose: previousActivity.purpose ?? null,
                    vehicleNumber: previousActivity.vehicleNumber ?? null,
                    entryTime: previousActivity.entryTime ?? null,
                    exitTime: previousActivity.exitTime ?? null
                },
                options: [
                    "mark_suspicious",
                    "pass_this_time",
                    "cancel_scan"
                ]
            });
        }

        // 17. NO CONFLICT + NORMAL ENTRY
        if (currentActivity === "entry") {
            // Send the normal editable form.
            // The form will be submitted to /recordEntry.
            return res.status(200).json({
                outcome: "ENTRY_FORM_REQUIRED",
                conflictType: "NOR",
                visitState,
                message: "Verify Visitor Information And Record Entry",
                visitor: visitorInfo,
                editableFields: [
                    "purpose",
                    "vehicleNumber"
                ]
            });
        }

        // 18. NO CONFLICT + NORMAL EXIT

        // At this point, the last activity must be Entry.
        // Its entryTime must exist and exitTime must be null.

        if (lastActivityType !== "entry" ||previousActivity.entryTime == null) {
            return res.status(409).json({
                error:true,
                message: "Valid active entry not found. Please verify visitor history."
            });
        }

        const now = new Date();
        // 19. EXIT WHEN TODAY'S DOCUMENT EXISTS

        if (todayHistory) {

            // Update the exit time in the LAST activity
            // of today's existing document.
            const updatedHistory = await OrganizationVisitHistory.findOneAndUpdate(
                    { _id: todayHistory._id,
                        activity: {
                            $elemMatch: {
                                _id: previousActivity._id,
                                entryTime: { $ne: null },
                                exitTime: null
                            }
                        }
                    },
                    {
                        $set: {
                            "activity.$.exitTime": now
                        }
                    },
                    {
                         returnDocument: "after",
                        runValidators: true
                    }
                ).select("_id visitDate");

            if (!updatedHistory) {
                return res.status(409).json({
                    error:true,
                    message: "Visitor activity has already changed. Please scan again."
                });
            }


            return res.status(200).json({
                outcome: "EXIT SUCCESSFULL",
                conflictType: "NOR",
                message: "Visitor Exit Recorded Successfully",
                visitor: {
                    name: visitor.name
                },
                exitTime: now,
                visitDate
            });
        }
        // 20. EXIT WHEN LAST HISTORY IS FROM
        //     A PREVIOUS DAY

        // User requirement:
        // 1. Take previous day's last activity information.
        // 2. Update its exit time to close the old entry.
        // 3. Create a NEW document for today.
        // 4. Copy visitor snapshot and activity information.
        // 5. Put today's exit time in the new document.

        const newDailyHistory = {
            organizationId: selectedOrganizationId,
            visitorId: visitor._id,
            visitDate,
            name: relevantHistory.name ?? visitor.name,
            email: relevantHistory.email ?? visitor.email,
            phoneNumber: relevantHistory.phoneNumber ?? visitor.phoneNumber,
            address: relevantHistory.address ?? visitor.address,
            gender: relevantHistory.gender ?? visitor.gender,
            identityNumber: relevantHistory.identityNumber ?? visitor.identityNumber,
            activity: [
                {
                    purpose: previousActivity.purpose ?? null,
                    vehicleNumber: previousActivity.vehicleNumber ?? null,
                    entryTime: previousActivity.entryTime,
                    exitTime: now
                }
            ]
        };


        // Both operations should succeed together:
        // update old day's entry and create today's document.
const session = await mongoose.startSession();
try {

await session.withTransaction(async () => {
const closedPreviousEntry =await OrganizationVisitHistory.updateOne(
                        {
                            _id: relevantHistory._id,
                            activity: {
                                $elemMatch: {
                                    _id: previousActivity._id,
                                    entryTime: { $ne: null },
                                    exitTime: null
                                }
                            }
                        },
                        {
                            $set: {"activity.$.exitTime": now }
                        },
                        {
                            session,runValidators: true
                        }
                    );
       if (closedPreviousEntry.modifiedCount !== 1) {
       const error = new Error("Previous visitor activity has already changed. Please scan again.");
       error.status = 409;
       throw error;
       }
      await OrganizationVisitHistory.create([newDailyHistory],{ session });
      });
    } 
    finally {
        await session.endSession();
    }

        // 21. SUCCESSFUL CROSS-DAY EXIT
        return res.status(200).json({
            outcome: "EXIT SUCCESSFULL",
                conflictType: "NOR",
                visitState,
                message: "Visitor Exit Recorded SuccessFully",
                visitor: {
                    name: visitor.name
                },
                exitTime: now,
                visitDate
        });

    } 
    catch (error) {
    console.error("Visitor QR scan error:", error);

        if (error.status) {
            return res.status(error.status).json({
                error:true,
                message: error.message
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                   error:true,
                message: "Visitor history was updated simultaneously. Please scan again."
            });
        }

        if (error.name === "CastError" || error.name === "ValidationError" ) {
            return res.status(400).json({
                   error:true,
                message: "Invalid request data"
            });
        }

        return res.status(500).json({
               error:true,
            message: "Internal server error while processing QR scan"
        });
    }
});


// Validate optional text fields
function normalizeOptionalText(value, fieldName, maxLength, uppercase = false) {

    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "string") {
        const error = new Error(`${fieldName} must be a string`);
        error.status = 400;
        throw error;
    }

    const cleanedValue = value.trim();

    if (cleanedValue.length > maxLength) {
        const error = new Error(`${fieldName} is too long`);
        error.status = 400;
        throw error;
    }

    if (!cleanedValue) {
        return null;
    }

    return uppercase ? cleanedValue.toUpperCase() : cleanedValue;
}


// Parse optional date/time received from frontend
function parseOptionalDate(value, fieldName) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        const error = new Error(`${fieldName} must be a valid date`);
        error.status = 400;
        throw error;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        const error = new Error(`${fieldName} is invalid`);
        error.status = 400;
        throw error;
    }
    return parsedDate;
}


// Ensure the activity being updated is still the last array element
function lastActivityFilter(historyId, activityId) {
    return {
        _id: historyId,

        $expr: {
            $eq: [
                { $arrayElemAt: ["$activity._id", -1] },
                activityId
            ]
        }
    };
}



//Route to complete the scan ---------->
router.route("/completeScan").post(checkValidGuard, async (req, res) => {
try {


const guardId = req.gaurdID.id;

const {visitorId,organizationCode,activity,action,purpose,vehicleNumber,lastEntryTime,lastExitTime} = req.body || {};

        //  VALIDATE REQUEST
        if (!mongoose.isValidObjectId(guardId)) {
            return res.status(401).json({
                error:true,
                message: "Invalid guard authentication"
            });
        }
        if (!mongoose.isValidObjectId(visitorId)) {
            return res.status(400).json({
                error:true,
                message: "Invalid visitor ID"
            });
        }

     if (typeof activity !== "string" || !["entry", "exit"].includes(activity.trim().toLowerCase())) {
            return res.status(400).json({
                error:true,
                message: "Invalid activity"
            });
        }

        const currentActivity = activity.trim().toLowerCase();
        if (!["record_entry", "pass_this_time", "mark_suspicious"].includes(action)) {
            return res.status(400).json({
                error:true,
                message: "Invalid scan action"
            });
        }

        // VALIDATE ORGANIZATION CODE

        if ( typeof organizationCode !== "string" || !organizationCode.trim()) {
            return res.status(403).json({
                error:true,
                message: "OrganizationCode is not valid"
            });
        }

        const selectedOrganizationCode = organizationCode.trim().toUpperCase();

        //  FIND ORGANIZATION
        const organization = await Organization.findOne({
            organizationCode: selectedOrganizationCode
        }).select("_id organizationCode").lean();
         if (!organization) {
            return res.status(404).json({
                error:true,
                message: "Organization not found"
            });
        }
        const selectedOrganizationId = organization._id;

        // VERIFY GUARD MEMBERSHIP

        const membership = await OrganizationGuard.findOne({
            guardId,
            organizationId: selectedOrganizationId,
            status: "allowed"
        }).select("_id").lean();

        if (!membership) {
            return res.status(403).json({
                error:true,
                message: "You are not authorized for this organization"
            });
        }

        // FETCH PERMANENT VISITOR

        const visitor = await PermanentVisitor.findById(visitorId)
            .select(
                "name email phoneNumber address age gender purpose isBlocked identityNumber suspiciousCount"
            ).lean();

        if (!visitor){
            return res.status(404).json({
                error:true,
                message: "Visitor account not found"
            });
        }
        if (visitor.isBlocked) {
            return res.status(403).json({
                error:true,
                message: "This visitor is blocked"
            });
        }

        // GET TODAY'S HISTORY

        const visitDate = getVisitDate("Asia/Kolkata");

        const todayHistory = await OrganizationVisitHistory.findOne({
            organizationId: selectedOrganizationId,
            visitorId: visitor._id,
            visitDate
        }).select("_id visitDate activity").lean();

        //  IF TODAY'S HISTORY IS ABSENT,
        //    FIND MOST RECENT PREVIOUS HISTORY

        let relevantHistory = todayHistory;
        if (!todayHistory) {
            relevantHistory = await OrganizationVisitHistory.findOne({
                organizationId: selectedOrganizationId,
                visitorId: visitor._id,
                visitDate: { $lt: visitDate },
                "activity.0": { $exists: true }
            }).sort({ visitDate: -1 }).select("_id visitDate activity").lean();
        }

        //  GET ONLY THE LATEST ACTIVITY

        const activities = relevantHistory?.activity || [];

        if (relevantHistory && activities.length === 0) {
            return res.status(409).json({
                error:true,
                message: "Visitor history is inconsistent , Scanning may not work, tell him to create a new visitor account "
            });
        }

        const previousActivity = activities.length > 0? activities[activities.length - 1]: null;

        //  DETERMINE PREVIOUS ACTIVITY

        if (previousActivity && previousActivity.entryTime == null && previousActivity.exitTime == null) {
            return res.status(409).json({
                error:true,
                message: "Invalid previous activity record"
            });
        }

const lastActivityType = previousActivity? (previousActivity.exitTime == null? "entry": "exit") : null;

        // RECHECK CONFLICT
    
        let conflictType = "NOR";
        if (previousActivity && currentActivity === lastActivityType) {
            conflictType = currentActivity === "entry"? "ENT": "EXT";
        }

        //  PREPARE VISITOR SNAPSHOT

        const visitorSnapshot = {
            organizationId: selectedOrganizationId,
            visitorId: visitor._id,
            visitDate,
            name: visitor.name,
            email: visitor.email,
            phoneNumber: visitor.phoneNumber,
            address: visitor.address,
            gender: visitor.gender,
            identityNumber: visitor.identityNumber
        };


    // NORMALIZE PURPOSE AND VEHICLE NUMBER

    const purposeValue = purpose === undefined
            ? (visitor.purpose || null)
            : normalizeOptionalText(purpose, "Purpose", 200);

    const vehicleNumberValue = normalizeOptionalText(vehicleNumber,"Vehicle number",40,true);

        // MARK VISITOR SUSPICIOUS

        if(action === "mark_suspicious"){

            // Marking suspicious is allowed only when
            // an actual Entry/Exit conflict exists.

            if (conflictType === "NOR") {
                return res.status(409).json({
                    error:true,
                    message: "No suspicious activity exists regarding this visitor , Scan again ."
                });
            }

            const now = new Date();
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {

                // Increase global suspicious count
                const updatedVisitor =await PermanentVisitor.findOneAndUpdate(
                           { _id: visitor._id },
                             [
                          {
                           $set: {
                           suspiciousCount: {
                           $add: [
                          { $ifNull: ["$suspiciousCount", 0] },
                            1]} }},
                         {
                          $set: {
                          isBlocked: {
                         $or: [
                            { $eq: ["$isBlocked", true] },
                            { $gte: ["$suspiciousCount", 10] }
                        ]
                    }
                }
            }
        ],
        {
            returnDocument: "after",
            session,
            updatePipeline: true
        }
    ).select("suspiciousCount isBlocked");

if (!updatedVisitor) {
    const error = new Error("Visitor not found");
    error.status = 404;
    throw error;
}

// Save organization-specific suspicious record
await OrganizationSuspiciousRecord.create([
                            {
                                organizationId: selectedOrganizationId,
                                visitorId: visitor._id,
                                guardId,
                                attemptedActivity: currentActivity,
                                previousActivity: lastActivityType,
                                conflictType,
                                markedAt: now
                            }
                        ],
                        { session }
                    );
                });

            } finally {
                await session.endSession();
            }

            return res.status(200).json({
                outcome: "SUSPICIOUS_MARKED",
                message: "Visitor Marked as Suspicious Successfully",
                name:visitor.name,
            });
        }

        //  NORMAL ENTRY SUBMISSION
        if (action === "record_entry"){
            if (currentActivity !== "entry") {
                return res.status(400).json({
                    error:true,
                    message: "Entry action requires entry activity"
                });
            }

            // If a conflict exists, the guard must use
            // the pass_this_time resolution flow instead.
            if (conflictType !== "NOR") {
                return res.status(409).json({
                     error:true,
                    conflictType,
                    message: "Please Scan Again Some Conflict Occur "
                });
            }

            const now = new Date();

            const newActivity = {
                purpose: purposeValue,
                vehicleNumber: vehicleNumberValue,
                entryTime: now,
                exitTime: null
            };

            let savedHistory;
            if (todayHistory) {

                // Append to today's existing document.
                // Ensure the previous Exit is still the last activity.

                if (!previousActivity) {
                    return res.status(409).json({
                        error:true,
                        message: "Today's activity history is inconsistent , Please scan again."
                    });
                }

                savedHistory = await OrganizationVisitHistory.findOneAndUpdate(
                    {
                        ...lastActivityFilter(
                            todayHistory._id,
                            previousActivity._id
                        ),

                        activity: {
                            $elemMatch: {
                                _id: previousActivity._id,
                                exitTime: { $ne: null }
                            }
                        }
                    },
                    {
                        $push: {
                            activity: newActivity
                        }
                    },
                    {
                         returnDocument: "after",
                        runValidators: true
                    }
                ).select("_id visitDate");

                if (!savedHistory) {
                    return res.status(409).json({
                        error:true,
                        message: "Visitor activity has changed. Please scan again."
                    });
                }

            } else {

                // No document today.
                // Create today's document, whether this is
                // the visitor's first visit or a new-day visit.

                savedHistory = await OrganizationVisitHistory.create({
                    ...visitorSnapshot,
                    activity: [newActivity]
                });
            }

            return res.status(200).json({
                outcome: "ENTRY SUCCESSFULL",
                conflictType: "NOR",
                message: "Visitor Entry Recorded SuccessFully",
                visitor: {
                    name: visitor.name
                },
                entryTime: now,
                visitDate
            });
        }

        // PASS THIS TIME - CONFLICT RESOLUTION

        if (action === "pass_this_time") {

            if (conflictType === "NOR") {
                return res.status(409).json({
                    error:true,
                    message: "No activity conflict exists to resolve"
                });
            }

            const now = new Date();

            // CONFLICT ENT: ENTRY == ENTRY
            
    if (conflictType === "ENT") {
    // Guard supplies the visitor's previous exit time.
    // This value can be null when the visitor doesn't remember.
    const suppliedLastExitTime = parseOptionalDate(lastExitTime,"Last exit time");
    if(suppliedLastExitTime &&
     (!previousActivity.entryTime ||
      suppliedLastExitTime < new Date(previousActivity.entryTime) ||
      suppliedLastExitTime > now
    )){
        return res.status(400).json({
            error:true,
        message: "Last exit time must be after the previous entry and cannot be in the future .Please scan again and ask exit time again",
        previousEntryTime: previousActivity.entryTime
    });
}

        // Save the new current Entry
         const newActivity = {
                    purpose: purposeValue,
                    vehicleNumber: vehicleNumberValue,
                    entryTime: now,
                    exitTime: null
            };

       const session = await mongoose.startSession();
        try {
         await session.withTransaction(async () => {
         // Check whether the previous activity
         // is still the latest activity.

    const stillLatest = await OrganizationVisitHistory.findOne(
                                lastActivityFilter(
                                    relevantHistory._id,
                                    previousActivity._id
                                )
                            ).session(session).select("_id").lean();

            if (!stillLatest) {
                const error = new Error("Visitor activity has changed. Please scan again.");
                error.status = 409;
                throw error;
                }

                        // If guard supplied the last exit time,
                        // update the previous Entry's exitTime.

        if (suppliedLastExitTime) {

        const updatedPrevious = await OrganizationVisitHistory.updateOne(
                                    {
                                        _id: relevantHistory._id,
                                      activity: {
                                            $elemMatch: {
                                                _id: previousActivity._id,
                                                entryTime: { $ne: null },
                                                exitTime: null
                                            }
                                        }
                                    },
                                    {
                                        $set: {
                                            "activity.$.exitTime": suppliedLastExitTime
                                        }
                                    },
                                    {
                                        session,
                                        runValidators: true
                                    }
                                );
                          if (updatedPrevious.modifiedCount !== 1) {
                                const error = new Error("Previous entry has already changed");
                                error.status = 409;
                                throw error;
                            }
        }

           if (todayHistory) {
            // Same-day conflict:
            // Append new Entry to today's document.
             const appended = await OrganizationVisitHistory.updateOne(
                                    lastActivityFilter(
                                        todayHistory._id,
                                        previousActivity._id
                                    ),
                                    {
                                        $push: {
                                            activity: newActivity
                                        }
                                    },
                                    { session }
                                );

                            if (appended.modifiedCount !== 1) {
                                const error = new Error(
                                    "Unable to append new entry"
                                );
                                error.status = 409;
                                throw error;
                            }

            }
             else { // Previous-day conflict:
                    // Create a new daily document for today.
                    await OrganizationVisitHistory.create([
                                    {
                                        ...visitorSnapshot,
                                        activity: [newActivity]
                                    }
                                ],
                                { session }
                            );
                        }
                    });

                } finally {
                    await session.endSession();
                }

                return res.status(200).json({
                    outcome: "ENTRY SUCCESSFULL",
                    conflictType: "ENT",
                    manuallyResolved: true,
                    message: "Visitor entry recorded successfully after resolving the conflict",
                    visitor: {
                        name: visitor.name
                    },
                    entryTime: now,
                    visitDate
                });
            }
            // 18. CONFLICT EXT: EXIT == EXIT

        if (conflictType === "EXT") {

                // Guard supplies the visitor's last entry time.
                // It can be null if the visitor doesn't remember.

        const suppliedLastEntryTime = parseOptionalDate(lastEntryTime,"Last entry time");

        if (suppliedLastEntryTime &&
                   (
                    suppliedLastEntryTime > now ||
                    (
                      previousActivity.exitTime &&
                      suppliedLastEntryTime <= new Date(previousActivity.exitTime)
                    )
                    )
                ) 
                {
                   return res.status(400).json({
                     error: true,
                     message: "Last entry time must be after the previous exit time and cannot be in the future. Please scan again !",
                     previousExitTime: previousActivity.exitTime
                    });
                }
                // New activity:
                // Entry time comes from guard's form.
                // Exit time is recorded by backend now.

                const newActivity = {
                    purpose: purposeValue,
                    vehicleNumber: vehicleNumberValue,
                    entryTime: suppliedLastEntryTime,
                    exitTime: now
                };

                let savedHistory;
                if (todayHistory) {
                    // Append to today's existing activity array.
                    savedHistory = await OrganizationVisitHistory.findOneAndUpdate(
                        lastActivityFilter(
                            todayHistory._id,
                            previousActivity._id
                        ),
                        {
                            $push: {
                                activity: newActivity
                            }
                        },
                        {
                             returnDocument:"after",
                            runValidators: true
                        }
                    ).select("_id visitDate");

                    if (!savedHistory) {
                        return res.status(409).json({
                            error:true,
                            message: "Visitor activity has changed. Please scan again."
                        });
                    }

                } else {
                    // Previous-day conflict:
                    // No document today, so create a new daily document.
                    savedHistory = await OrganizationVisitHistory.create({
                        ...visitorSnapshot,
                        activity: [newActivity]
                    });
                }

                return res.status(200).json({
                    outcome: "EXIT SUCCESSFULL",
                    conflictType:"EXT",
                    manuallyResolved: true,
                    message: "Visitor exit recorded successfully after resolving the conflict",
                    visitor: {
                        name: visitor.name
                    },
                    entryTime: suppliedLastEntryTime,
                    exitTime: now,
                    visitDate
                });
            }
        }

    } catch (error) {
        console.error("Complete visitor scan error:", error);
        if (error.status) {
            return res.status(error.status).json({
                error:true,
                message: error.message
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                error:true,
             message: "Visitor history already exists or was updated simultaneously. Please scan again."
         });
        }

        if ( error.name === "CastError" || error.name === "ValidationError") {
            return res.status(400).json({
                error:true,
                message: "Invalid request data , Please scan again."
            });
        }

        return res.status(500).json({
            error:true,
            message: "Unable to complete visitor scan. Please scan again after sometime ."
        });
    }
});

module.exports = router;