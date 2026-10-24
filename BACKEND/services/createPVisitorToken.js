const JWT=require("jsonwebtoken")
const secret=process.env.JWT_SECRET;



//creating token for pvisitor----------->
function createPvisitorToken(pvisitor){
    const payload={
        id:pvisitor._id,
    };
    const token =JWT.sign(payload,secret);
    return token;
}


module.exports={createPvisitorToken}