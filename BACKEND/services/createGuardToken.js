const JWT=require("jsonwebtoken")
const secret=process.env.JWT_GUARD_SECRET;



//creating token for gaurd----------->
function createGuardToken(guardID){
    const payload={
        id:guardID,
    };
    const token =JWT.sign(payload,secret);
    return token;
}


module.exports={createGuardToken}