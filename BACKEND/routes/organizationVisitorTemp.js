
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Organization = require("../model/organizationModel");
const OrganizationGuard = require("../model/organizationGuardModel");
const PermanentVisitor = require("../model/permanentVisitorModel");
const OrganizationVisitHistory = require("../model/organizationVisitHistoryModel");
const { checkValidGuard } = require("../middleware/checkValidGuard");
const { validateAadhaarNumber } = require("../services/isValidAadhaarNumber");


// COMMON ERROR HELPER
function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

// GET CURRENT DATE IN IST
function getVisitDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const values = {};
    parts.forEach(part => {
        values[part.type] = part.value;
    });

    return `${values.year}-${values.month}-${values.day}`;
}


// VALIDATE AND NORMALIZE AADHAAR
function normalizeAadhaar(identityNumber) {
    const result = validateAadhaarNumber(identityNumber);
    if (!result ||!result.valid ||typeof result.normalizedNumber !== "string") {
        throw httpError(400, result?.message || "Invalid Aadhaar number.");
    }
    return result.normalizedNumber;
}


// VALIDATE VISITOR DETAILS
function validateVisitorDetails(body) {
    const fields = [
        "name",
        "email",
        "phoneNumber",
        "address",
        "gender",
        "purpose",
        "vehicleNumber"
    ];

    for (const field of fields) {
        const value = body[field];
        if ( value !== undefined && value !== null && typeof value !== "string") {
            throw httpError(400, `Invalid ${field}.`);
        }
    }
    const name = typeof body.name === "string"? body.name.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string"? body.phoneNumber.trim() : "";

    if (!name) { 
        throw httpError(400, "Name is required.");
    }

    const emailText = typeof body.email === "string" ? body.email.trim() : "";

    if (emailText && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText)) {
        throw httpError(400, "Invalid email address.");
    }
    let age;

    if (body.age !== undefined && body.age !== null && body.age !== "") {
        age = Number(body.age);
        if (typeof body.age === "boolean" || typeof body.age === "object" ||!Number.isInteger(age) ||
            age < 1 ||
            age > 120
        ) {
            throw httpError(400, "Invalid visitor age.");
        }
    }

    const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";

    if (purpose.length > 200) {
        throw httpError(400, "Purpose cannot exceed 200 characters.");
    }

const vehicleNumber =typeof body.vehicleNumber === "string"? body.vehicleNumber.trim().toUpperCase(): "";

if(vehicleNumber.length > 40) {
    throw httpError(400, "Vehicle number cannot exceed 40 characters.");
}

    return {
        name,
        email: emailText ? emailText.toLowerCase() : null,
        phoneNumber,
        address: body.address?.trim() || undefined,
        age,
        gender: body.gender?.trim() || undefined,
        purpose: purpose || null,
        vehicleNumber: vehicleNumber || null
    };
}


// VALIDATE OPTIONAL DATE/TIME
function parseOptionalDate(value, fieldName) {
    if ( value === undefined || value === null || value === "" ) {
        return null; }

    if ( typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
        throw httpError(400, `Invalid ${fieldName}.`);
    }

    const parsed = new Date(value);

    if (!Number.isFinite(parsed.getTime())) {  throw httpError(400, `Invalid ${fieldName}.`); }
    return parsed;
}


// FIND ORGANIZATION AND VERIFY GUARD
async function getAuthorizedOrganizationId(organizationCode, guardId) {

    if (typeof organizationCode !== "string" ||!organizationCode.trim()) {
        throw httpError(403, "Organization code is required.");
    }
    const organization = await Organization.findOne({
        organizationCode: organizationCode.trim().toUpperCase()
    }).select("_id").lean();

    if (!organization) {
        throw httpError(404, "Organization not found.");
    }

    const membership = await OrganizationGuard.findOne({
        guardId,
        organizationId: organization._id,
        status: "allowed"
    }).select("_id").lean();

    if (!membership) {
        throw httpError(403, "You are not authorized to access this organization.");
    }
    return organization._id;
}


// COMMON HISTORY PROJECTION
function historyProjection(query) {
    return query.select(
        "organizationId _id visitDate name email phoneNumber address age gender activity createdAt +identityNumber"
    ).lean();
}

// FIND TODAY'S TEMPORARY VISITOR DOCUMENT
async function findTodayTemporaryHistory(
    organizationId,
    identityNumber,
    visitDate,
    session
) {
    return historyProjection(
        OrganizationVisitHistory.findOne({
            organizationId,
            visitorId: null,
            identityNumber,
            visitDate
        }).sort({ createdAt: -1, _id: -1 }).session(session));
}


// FIND THE LATEST TEMPORARY VISITOR DOCUMENT
async function findLatestTemporaryHistory(
    organizationId,
    identityNumber,
    visitDate,
    session
) {
    return historyProjection(
        OrganizationVisitHistory.findOne({
            organizationId,
            visitorId: null,
            identityNumber,
            visitDate: { $lt: visitDate }
        })
        .sort({
            visitDate: -1,
            createdAt: -1,
            _id: -1
        })
        .session(session)
    );
}


// GET LAST ACTIVITY
function getLastActivity(history) {
    if (!history || !Array.isArray(history.activity) || history.activity.length === 0) {
        return null;
    }
    return history.activity[history.activity.length - 1];
}

// ENSURE THE ACTIVITY BEING UPDATED IS STILL THE LAST ACTIVITY
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

// GET VISITOR DETAILS FROM AN EXISTING HISTORY
function getVisitorSnapshotFromHistory(history, identityNumber) {
    return {
        name: history.name,
        email: history.email ?? null,
        phoneNumber: history.phoneNumber,
        address: history.address,
        age: history.age,
        gender: history.gender,
        identityNumber: history.identityNumber || identityNumber
    };
}

// PREPARE VISITOR INFORMATION FOR FRONTEND
function getVisitorDetailsForResponse(source) {
    if (!source) return null;
    return {
        name: source.name,
        email: source.email ?? null,
        phoneNumber: source.phoneNumber,
        address: source.address ?? null,
        age: source.age ?? null,
        gender: source.gender ?? null
    };
}

// CREATE A NEW DAILY DOCUMENT
async function createTemporaryDailyHistory({
    organizationId,
    identityNumber,
    visitDate,
    details,
    activity,
    session
}) {

    const history = new OrganizationVisitHistory({
        organizationId,
        visitorId: null,
        visitDate,
        name: details.name,
        email: details.email,
        phoneNumber: details.phoneNumber,
        address: details.address,
        age: details.age,
        gender: details.gender,
        identityNumber,
        activity: [activity]
    });

    await history.save({ session });
    return history;
}

// APPEND NEW ACTIVITY TO EXISTING DAILY DOCUMENT
async function appendTemporaryActivity({
    history,
    identityNumber,
    activity,
    session
}) {

    const last = getLastActivity(history);

    if (!last) {
        throw httpError(
            409,
            "Today's visitor history is inconsistent. Please contact support."
        );
    }

    const result = await OrganizationVisitHistory.updateOne(
        {
            ...lastActivityFilter(history._id, last._id),
            organizationId: history.organizationId,
            visitorId: null,
            identityNumber
        },
        {
            $push: { activity }
        },
        {
            session,
            runValidators: true
        }
    );

    if (result.modifiedCount !== 1) {
        throw httpError(
            409,
            "Visitor activity has changed. Please try again."
        );
    }
}

// CLOSE PREVIOUS OPEN ENTRY
async function closeTemporaryLastEntry({
    history,
    activity,
    identityNumber,
    exitTime,
    session
}) {

    const result = await OrganizationVisitHistory.updateOne(
        {
            ...lastActivityFilter(history._id, activity._id),
            organizationId: history.organizationId,
            visitorId: null,
            identityNumber,
            activity: {
                $elemMatch: {
                    _id: activity._id,
                    entryTime: { $ne: null },
                    exitTime: null
                }
            }
        },
        {
            $set: {
                "activity.$.exitTime": exitTime
            }
        },
        {
            session,
            runValidators: true
        }
    );

    if (result.modifiedCount !== 1) {
        throw httpError(
            409, "Previous visitor activity has already changed. Please try again." );
    }
}

// COMMON ERROR HANDLER
function sendRouteError(res, error, logLabel) {

    // Never log request bodies or Aadhaar numbers.
    console.error(logLabel, {
    name: error.name,
    message: error.message,
    code: error.code,
    status: error.status,
    stack: error.stack
});

    if (error.status) {
        return res.status(error.status).json({
            error: true,
            message: error.message
        });
    }

    if (error.code === 11000) {
        return res.status(409).json({
            error: true,
            message: "A visitor record already exists or was updated simultaneously. Please try again."
        });
    }

    if ( error.name === "ValidationError" || error.name === "CastError" ) {
        return res.status(400).json({
            error: true,
            message: "Invalid visitor information."
        });
    }

    return res.status(500).json({
        error: true,
        message: "Internal server error. Please try again."
    });
}

// route for entry-------->
router.route("/visitorEntry").post(checkValidGuard, async (req, res) => {

    let session;
    try {

        const body = req.body || {};
        const guardId = req.gaurdID.id;

        // 1. VALIDATE GUARD
        if (!mongoose.isValidObjectId(guardId)) {
            return res.status(401).json({
                error: true,
                message: "Invalid guard authentication."
            });
        }

        // 2. VALIDATE AADHAAR
        const identityNumber = normalizeAadhaar(body.identityNumber);

        // 3. VALIDATE VISITOR DETAILS
        const details = validateVisitorDetails(body);

        // 4. VALIDATE CONFLICT RESOLUTION REQUEST
        const resolvePreviousVisit = body.resolvePreviousVisit ?? false;

        if (typeof resolvePreviousVisit !== "boolean") {
            return res.status(400).json({
                error: true,
                message: "Invalid previous visit resolution request."
            });
        }

        if (resolvePreviousVisit && !mongoose.isValidObjectId(body.previousVisitId)) {
            return res.status(400).json({
                error: true,
                message: "Invalid previous visit ID."
            });
        }

        if ( body.previousExitTime !== undefined &&
            body.previousExitTime !== null &&
            body.previousExitTime !== "" &&
            !resolvePreviousVisit
        ) {
            return res.status(400).json({
                error: true,
                message: "Previous exit time requires conflict resolution."
            });
        }

    const previousExitTime = parseOptionalDate( body.previousExitTime,"previous exit time");

    // 5. FIND ORGANIZATION AND VERIFY GUARD
    const organizationId = await getAuthorizedOrganizationId( body.organizationCode, guardId );


    // 6. CHECK WHETHER VISITOR IS REGISTERED
     const registeredVisitor = await PermanentVisitor.findOne({ identityNumber }).select("_id").lean();

        if (registeredVisitor) {
            return res.status(409).json({
                error: true,
                registeredVisitor: true,
                message: "This visitor is registered on the app. Please use the Registered Visitor option."
            });
        }


        // 7. GET CURRENT DATE AND TIME
        const currentTime = new Date();
        const visitDate = getVisitDate(currentTime);


        // 8. START TRANSACTION
        session = await mongoose.startSession();

        let routeResult = null;
        await session.withTransaction(async () => {

            routeResult = null;
            // FIND TODAY'S DOCUMENT FIRST
          const todayHistory = await findTodayTemporaryHistory(
               organizationId,
               identityNumber,
               visitDate,
               session
               );

     // Only search previous days when today's document doesn't exist
             let latestHistory = todayHistory;

            if (!todayHistory) {
               latestHistory = await findLatestTemporaryHistory(
                   organizationId,
                   identityNumber,
                   visitDate,
                   session
                );
                }
            
            const previousActivity = getLastActivity(latestHistory);

            if (latestHistory && !previousActivity) {
                throw httpError(
                    409,
                    "Previous visitor history has no activity. Please contact support."
                );
            }

            if (previousActivity &&
                previousActivity.entryTime == null &&
                previousActivity.exitTime == null
            ) {
                throw httpError(
                    409,
                    "Previous visitor activity is inconsistent. Please contact support."
                );
            }


            // CHECK WHETHER PREVIOUS ENTRY HAS NO EXIT
            const hasPreviousUnrecordedExit = Boolean(
                previousActivity &&
                previousActivity.entryTime != null &&
                previousActivity.exitTime == null
            );

            // CASE 1: INITIAL REQUEST - CHECK CONFLICT

            if (!resolvePreviousVisit && hasPreviousUnrecordedExit){
                routeResult = {
                    status: 409,
                    body: {
                        error: true,
                        conflict: true,
                        conflictType: "ENT",
                        message: "Previous entry has no recorded exit. Resolve it before recording the new entry.",
                        previousVisitId: latestHistory._id,
                        previousEntryTime: previousActivity.entryTime,
                        previousVisitDate: latestHistory.visitDate,
                        // Today's snapshot if available,
                        // otherwise the details filled by the guard.
                        visitor: getVisitorDetailsForResponse(todayHistory || details ),
                        // Prefill purpose and vehicle number
                        // from the previous activity.
                        previousActivity: {
                            purpose: previousActivity.purpose ?? null,
                            vehicleNumber: previousActivity.vehicleNumber ?? null,
                            entryTime: previousActivity.entryTime,
                            exitTime: previousActivity.exitTime
                        }
                    }
                };
                return;
            }

            // CASE 2: RESOLVE PREVIOUS ENTRY CONFLICT

            if (resolvePreviousVisit) {

                // Verify that the same previous visit still exists.
                if ( !hasPreviousUnrecordedExit ||
                    !latestHistory ||
                    latestHistory._id.toString() !== body.previousVisitId
                ) {
                    routeResult = {
                        status: 409,
                        body: {
                            error: true,
                            message: "Previous visit has changed. Please check the visitor's latest history again."
                        }
                    };
                    return;
                }


                // IF GUARD SUPPLIES PREVIOUS EXIT TIME
                if (previousExitTime) {
                    const previousEntryTime = new Date( previousActivity.entryTime );

                if (previousExitTime <= previousEntryTime || previousExitTime > currentTime ){
                        routeResult = {
                            status: 400,
                            body: {
                                error: true,
                                message: "Previous exit time must be after the previous entry time and cannot be in the future.",
                                previousEntryTime: previousActivity.entryTime
                            }
                        };
                        return;
                    }
                    // UPDATE PREVIOUS ENTRY'S EXIT TIME
                    await closeTemporaryLastEntry({
                        history: latestHistory,
                        activity: previousActivity,
                        identityNumber,
                        exitTime: previousExitTime,
                        session
                    });
                }
                // If previousExitTime is empty,
                // the previous activity remains unchanged.
            }

            // CASE 3: PREPARE NEW ENTRY

            const newActivity = {
                purpose: details.purpose,
                vehicleNumber: details.vehicleNumber,
                entryTime: currentTime,
                exitTime: null
            };

            // CASE 4: SAVE ENTRY

            if (todayHistory) {
                // Today's document already exists.
                // Preserve its profile snapshot.
                // Append only the new activity.
                await appendTemporaryActivity({
                    history: todayHistory,
                    identityNumber,
                    activity: newActivity,
                    session
                });

            } else {
                // No document today.
                // Create today's document using the
                // visitor details submitted by the guard.
                await createTemporaryDailyHistory({
                    organizationId,
                    identityNumber,
                    visitDate,
                    details,
                    activity: newActivity,
                    session
                });
            }
            // SUCCESS
            routeResult = {
                status: 201,
                body: {
                    error: false,
                    message: "Temporary visitor entry recorded successfully.",
                    visitDate
                }
            };

        });

        // 9. RETURN RESPONSE
        if (!routeResult) {
            return res.status(500).json({
                error: true,
                message: "Unable to process visitor entry."
            });
        }

        return res.status(routeResult.status).json(routeResult.body);

    } catch (error) {
        return sendRouteError(
            res,error,"Temporary visitor entry error:"
        );

    } finally {
        if(session) {
            await session.endSession();
        }
    }
});

// Route for exit------>
router.route("/visitorExit").post(checkValidGuard, async (req, res) => {

    let session;

    try {
        const body = req.body || {};
        const guardId = req.gaurdID.id;

        // 1. VALIDATE GUARD
        if (!mongoose.isValidObjectId(guardId)) {
            return res.status(401).json({
                error: true,
                message: "Invalid guard authentication."
            });
        }
        // 2. VALIDATE AADHAAR
        const identityNumber = normalizeAadhaar(body.identityNumber);
        // 3. VALIDATE CONFLICT RESOLUTION REQUEST
        const resolveExitConflict = body.resolveExitConflict ?? false;

        if (typeof resolveExitConflict !== "boolean") {
            return res.status(400).json({
                error: true,
                message: "Invalid exit conflict resolution request."
            });
        }

        if ( resolveExitConflict && !["EXT", "FIRST_EXIT"].includes(body.conflictType)) {
            return res.status(400).json({
                error: true,
                message: "Invalid exit conflict type."
            });
        }

        if (resolveExitConflict &&
            body.conflictType === "EXT" &&
            !mongoose.isValidObjectId(body.previousVisitId)
        ) {
            return res.status(400).json({
                error: true,
                message: "Invalid previous visit ID."
            });
        }

        if (body.lastEntryTime !== undefined &&
            body.lastEntryTime !== null &&
            body.lastEntryTime !== "" &&
            !resolveExitConflict
        ) {
            return res.status(400).json({
                error: true,
                message: "Previous entry time requires conflict resolution."
            });
        }


        // 4. VALIDATE OPTIONAL PREVIOUS ENTRY TIME
        const lastEntryTime = parseOptionalDate(body.lastEntryTime,"previous entry time" );

        // 5. VALIDATE VISITOR DETAILS ONLY DURING RESOLUTION
        // Normal exit request requires only identityNumber.

        const details = resolveExitConflict ? validateVisitorDetails(body) : null;

        // 6. FIND ORGANIZATION AND VERIFY GUARD
        const organizationId = await getAuthorizedOrganizationId( body.organizationCode, guardId );

        // 7. CHECK WHETHER VISITOR IS REGISTERED
        const registeredVisitor = await PermanentVisitor.findOne({ identityNumber}).select("_id").lean();

        if (registeredVisitor) {
            return res.status(409).json({
                error: true,
                registeredVisitor: true,
                message: "This visitor is registered on the app. Please use the Registered Visitor option."
            });
        }


        // 8. GET CURRENT DATE AND TIME
        const currentTime = new Date();
        const visitDate = getVisitDate(currentTime);

        // 9. START TRANSACTION
        session = await mongoose.startSession();
        let routeResult = null;
        await session.withTransaction(async () => {
               routeResult = null;

            // FIND TODAY'S DOCUMENT FIRST
          const todayHistory = await findTodayTemporaryHistory(
                         organizationId,
                         identityNumber,
                         visitDate,
                        session
                        );

            // If today's document exists, it is the latest document.
           // Otherwise, search previous days.
           let latestHistory = todayHistory;

            if (!todayHistory) {
              latestHistory = await findLatestTemporaryHistory(
              organizationId,
              identityNumber,
              visitDate,
              session
             );
            }

           const previousActivity = getLastActivity(latestHistory);


            if (latestHistory && !previousActivity) {
                throw httpError(409,
                    "Previous visitor history has no activity. Please contact support."
                );
            }

            if (previousActivity &&
                previousActivity.entryTime == null &&
                previousActivity.exitTime == null
            ) {
                throw httpError(
                    409,
                    "Previous visitor activity is inconsistent. Please contact support."
                );
            }

            // CHECK WHETHER AN OPEN ENTRY EXISTS
            const hasOpenEntry = Boolean(
                previousActivity &&
                previousActivity.entryTime != null &&
                previousActivity.exitTime == null
            );

            // CASE 1: INITIAL EXIT REQUEST

            if (!resolveExitConflict) {
                // NO ACTIVE ENTRY: SHOW CONFLICT
                if (!hasOpenEntry) {

                    const conflictType = latestHistory? "EXT": "FIRST_EXIT";
                    const profileSource = todayHistory || latestHistory;
                    routeResult = {
                        status: 409,

                        body: {
                            error: true,
                            conflict: true,
                            conflictType,

                            message: conflictType === "EXT"
                                ? "Previous activity was also an exit. Resolve it before continuing."
                                : "No previous visitor entry was found. Please complete visitor details before recording exit.",

                            previousVisitId: conflictType === "EXT"? latestHistory._id : null,
                            previousExitTime: previousActivity?.exitTime ?? null,
                            previousVisitDate: latestHistory?.visitDate ?? null,
                            visitor: getVisitorDetailsForResponse(
                                profileSource
                            ),

                            previousActivity: previousActivity ? {
                                    purpose: previousActivity.purpose ?? null,
                                    vehicleNumber: previousActivity.vehicleNumber ?? null,
                                    entryTime: previousActivity.entryTime ?? null,
                                    exitTime: previousActivity.exitTime ?? null
                                } : null
                        }
                    };

                    return;
                }
                // NORMAL EXIT: ENTRY AND EXIT ON SAME DAY

                if (latestHistory.visitDate === visitDate) {

                    if (!todayHistory ||
                        todayHistory._id.toString() !== latestHistory._id.toString()
                    ) {
                        throw httpError(
                            409, "Today's visitor history is inconsistent. Please try again."
                        );
                    }

                    // UPDATE EXISTING ENTRY'S EXIT TIME
                    await closeTemporaryLastEntry({
                        history: todayHistory,
                        activity: previousActivity,
                        identityNumber,
                        exitTime: currentTime,
                        session
                    });
                }

                // NORMAL EXIT: ENTRY WAS ON A PREVIOUS DAY
                else {
                    if (todayHistory) {
                        throw httpError(
                            409,
                            "Today's visitor history is inconsistent. Please try again."
                        );
                    }

                    // CLOSE PREVIOUS DAY'S OPEN ENTRY
                    await closeTemporaryLastEntry({
                        history: latestHistory,
                        activity: previousActivity,
                        identityNumber,
                        exitTime: currentTime,
                        session
                    });

                    // CREATE TODAY'S DOCUMENT USING THE
                    // PREVIOUSLY SAVED VISITOR SNAPSHOT
                    const oldSnapshot = getVisitorSnapshotFromHistory(latestHistory,identityNumber );

                    await createTemporaryDailyHistory({
                        organizationId,
                        identityNumber,
                        visitDate,
                        details: oldSnapshot,

                        activity: {
                            purpose: previousActivity.purpose ?? null,
                            vehicleNumber: previousActivity.vehicleNumber ?? null,
                            entryTime: previousActivity.entryTime,
                            exitTime: currentTime
                        },
                        session
                    });
                }


                // NORMAL EXIT SUCCESS
                routeResult = {
                    status: 200,

                    body: {
                        error: false,
                        message: "Temporary visitor exit recorded successfully.",
                        exitTime: currentTime,
                        visitDate
                    }
                };

                return;
            }

            // CASE 2: RESOLVE EXIT CONFLICT
            if (body.conflictType === "FIRST_EXIT") {
                // FIRST EXIT: NO PREVIOUS HISTORY SHOULD EXIST
                if (latestHistory || todayHistory) {
                    routeResult = {
                        status: 409,
                        body: {
                            error: true,
                            message: "Visitor history has changed. Please check the latest record again."
                        }
                    };

                    return;
                }

            } else {

                // EXT: PREVIOUS ACTIVITY MUST STILL BE EXIT
                if (!latestHistory ||
                    latestHistory._id.toString() !== body.previousVisitId ||
                    !previousActivity ||
                    previousActivity.exitTime == null ||
                    hasOpenEntry
                ) {

                    routeResult = {
                        status: 409,
                        body: {
                            error: true,
                            message: "Previous visit has changed. Please check the latest history again."
                        }
                    };

                    return;
                }
            }

            // CASE 3: VALIDATE LAST ENTRY TIME

            if (lastEntryTime) {
                // CANNOT BE FUTURE TIME
                if (lastEntryTime > currentTime) {
                    routeResult = {
                        status: 400,
                        body: {
                            error: true,
                            message: "Previous entry time cannot be in the future."
                        }
                    };
                    return;
                }

                // EXT: NEW ENTRY TIME MUST BE AFTER PREVIOUS EXIT
                if (body.conflictType === "EXT" &&
                    previousActivity?.exitTime &&
                    lastEntryTime <= new Date(previousActivity.exitTime)
                ) {
                     routeResult = {
                        status: 400,
                        body: {
                            error: true,
                            message: "Previous entry time must be after the previous exit time.",
                            previousExitTime: previousActivity.exitTime
                        }
                    };

                    return;
                }
            }

            // CASE 4: PREPARE NEW EXIT ACTIVITY
            const newActivity = {
                purpose: details.purpose,
                vehicleNumber: details.vehicleNumber,
                entryTime: lastEntryTime,
                exitTime: currentTime
            };

            // CASE 5: SAVE EXIT
            if (todayHistory) {
                // TODAY'S DOCUMENT EXISTS.
                // PRESERVE ITS PROFILE SNAPSHOT.
                // APPEND ONLY THE NEW ACTIVITY.
                await appendTemporaryActivity({
                    history: todayHistory,
                    identityNumber,
                    activity: newActivity,
                    session
                });

            } else {
                // NO DOCUMENT TODAY.
                // CREATE TODAY'S DOCUMENT USING THE
                // DETAILS SUBMITTED BY THE GUARD.
                await createTemporaryDailyHistory({
                    organizationId,
                    identityNumber,
                    visitDate,
                    details,
                    activity: newActivity,
                    session
                });
            }
            // EXIT SUCCESS AFTER CONFLICT RESOLUTION
            routeResult = {
                status: 200,
                body: {
                    error: false,
                    message: "Temporary visitor exit recorded successfully after resolving the conflict.",
                    manuallyResolved: true,
                    entryTime: lastEntryTime,
                    exitTime: currentTime,
                    visitDate
                }
            };

        });


        // 10. RETURN RESPONSE
        if (!routeResult) {
            return res.status(500).json({
                error: true,
                message: "Unable to process visitor exit."
            });
        }
        return res.status(routeResult.status).json(routeResult.body);

    } catch (error) {

        return sendRouteError(
            res,
            error,
            "Temporary visitor exit error:"
        );

    } finally{
       if (session) {
            await session.endSession();
        }
    }
});


module.exports = router;
