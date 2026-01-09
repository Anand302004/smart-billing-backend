const express= require("express");
const pool =require('./db');
const cors= require('cors')
const authRoutes = require("./router/auth.router");
const verificationRoutes=require('./router/email.verification')

const app=express();
app.use(express.json());
app.use(cors());

//Check Server Run
app.get("/", (req, res)=>{
    res.send('Server is running 🚀')
});

//Routes
app.use("/api/auth", authRoutes);
app.use("/verification",verificationRoutes)

app.listen(3000, ()=>{
    console.log("Server running on port 3000 ✅");
})