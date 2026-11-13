require("dotenv").config();
const express=require("express");
const mongoose=require("mongoose");
const cors = require('cors');
const app=express();
const PORT = process.env.PORT;

//import from routes------->
const handlePvisitor=require ("./routes/permanentVisitor");
const handleSecurityGaurd=require("./routes/securityGuard");
const handleScan=require("./routes/organizationVisitorPerm");
const temporaryVisitor=require("./routes/organizationVisitorTemp");
const handleGuardHome=require("./routes/guardHomePage");

//middleware---->
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// connect to the database----->
mongoose.connect(process.env.MONGODB_URL).then(()=>{
    console.log("data base connect ho gya")
}).catch((err) => {
    console.error("database error occured", err);
  });


//Route for permanent visitor  ------>
app.use("/permanent_visitor",handlePvisitor);

//Route for security Gaurd   ----->
app.use("/security_guard",handleSecurityGaurd);

//Route for visitor having app   ------>
app.use("/scan_appVisitor",handleScan);

//Route for visitor not having app -------->
app.use("/scan_nonAppVisitor",temporaryVisitor);

//Route for guard home page----------->
app.use("/guardHomePage",handleGuardHome);












app.listen(PORT,()=>{
    console.log(`server connected and running on local port ${PORT}`)
});