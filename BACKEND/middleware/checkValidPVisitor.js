const JWT=require("jsonwebtoken")
const secret=process.env.JWT_SECRET;


//token validity checking ---------->
function validPvisitorToken(token){
    return JWT.verify(token,secret);
    
}

// middleware for token checking -------->
function checkValidPvisitor(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const pVisitorPayload = validPvisitorToken(token);
    req.pvisitor = pVisitorPayload;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports={
    checkValidPvisitor
}
