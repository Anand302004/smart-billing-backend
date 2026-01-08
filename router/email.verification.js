const express = require("express");
const { verifyOtp, sendEmail } = require("../controllers/verification");
const { checkUser, resetPassword } = require("../controllers/forget.password");
const router= express.Router()

router.post('/send-otp',sendEmail)
router.post("/verify-otp", verifyOtp({ respond: true }));

router.post("/forget-password",checkUser,sendEmail);
router.put("/reset-password",verifyOtp(),resetPassword)

module.exports =router