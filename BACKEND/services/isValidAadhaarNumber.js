
const multiplicationTable = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0]
];

const permutationTable = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8]
];


// VERHOEFF CHECKSUM VALIDATION
function isValidVerhoeff(number) {

    let checksum = 0;
    // Read digits from right to left
    for (let i = 0;i<number.length; i++) {
        const digit = Number( number[number.length-1-i] );
        checksum = multiplicationTable[checksum][permutationTable[i % 8][digit]];
    }

    return checksum === 0;
}


// MAIN AADHAAR VALIDATION FUNCTION
function validateAadhaarNumber(identityNumber) {

    // CHECK 1: REQUIRED FIELD
    if (
        identityNumber === undefined ||
        identityNumber === null ||
        (typeof identityNumber === "string" && identityNumber.trim() === "")
    ) {
        return {
            valid: false,
            message: "Aadhaar number is required."
        };
    }

    // CHECK 2: INPUT FORMAT
    if (
        typeof identityNumber !== "string" ||
        !/^[0-9 -]+$/.test(identityNumber)
    ) {
        return {
            valid: false,
            message: "Aadhaar number can contain only digits, spaces and hyphens."
        };
    }

    // CHECK 3: NORMALIZATION
    const normalizedNumber = identityNumber.replace(/[ -]/g, "");

    // CHECK 4: LENGTH
    if (normalizedNumber.length !== 12) {
        return {
            valid: false,
            message: "Aadhaar number must contain exactly 12 digits."
        };
    }

    // CHECK 5: STARTING DIGIT
    if (normalizedNumber[0] === "0" || normalizedNumber[0] === "1") {
        return {
            valid: false,
            message: "Aadhaar number cannot start with 0 or 1."
        };
    }

    // CHECK 6: VERHOEFF
    if (!isValidVerhoeff(normalizedNumber)) {
        return {
            valid: false,
            message: "The Aadhaar number provided is invalid. Please verify the details and try again."
        };
    }

    return {
        valid: true,
        message: "Aadhaar number passed format and checksum validation.",
        normalizedNumber
    };
}

module.exports = { validateAadhaarNumber };
