import express from "express";
const router = express.Router();

import { sendEmail, verifyOtp } from "../controllers/verification.js";
import { checkUser, resetPassword } from "../controllers/forget.password.js";

/* ================= FORGET PASSWORD ================= */
router.post('/send-email',sendEmail)
// Step 1: Check user + Send OTP
router.post("/forget-password", checkUser, sendEmail);

// Step 2: Verify OTP + Reset password
router.put("/reset-password", verifyOtp(), resetPassword);

export default router;

