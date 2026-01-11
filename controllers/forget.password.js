import bcrypt from "bcrypt";
import pool from "../db.js";

/* ================= CHECK USER ================= */
export const checkUser = async (req, res, next) => {
  const { email } = req.body;

  try {
    const result = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error("checkUser error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= RESET PASSWORD ================= */
export const resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  const email = req.verifiedEmail;

  if (!req.otpVerified) {
    return res.status(403).json({ message: "OTP not verified" });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = $1 WHERE email = $2",
      [hashedPassword, email]
    );

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Password reset failed" });
  }
};

