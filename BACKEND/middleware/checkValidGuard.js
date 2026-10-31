const JWT=require("jsonwebtoken")
const secret=process.env.JWT_GUARD_SECRET;


//token validity checking ---------->
function validGuardToken(token){
    return JWT.verify(token,secret);
    
}

// middleware for token checking -------->
function checkValidGuard(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const guardPayload = validGuardToken(token);
    req.gaurdID = guardPayload;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports={checkValidGuard}
