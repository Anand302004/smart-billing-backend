const express = require("express");
const router = express.Router();

const { sendEmail, verifyOtp } = require("../controllers/verification");
const { checkUser, resetPassword } = require("../controllers/forget.password");

/* ================= FORGET PASSWORD ================= */
router.post('/send-email',sendEmail)
// Step 1: Check user + Send OTP
router.post("/forget-password", checkUser, sendEmail);

// Step 2: Verify OTP + Reset password
router.put("/reset-password", verifyOtp(), resetPassword);

module.exports = router;
