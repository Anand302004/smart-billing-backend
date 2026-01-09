const nodemailer = require("nodemailer");
const pool = require("../db");
require("dotenv").config();

/* ================= MAIL TRANSPORT ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ================= TEMP OTP STORE ================= */
const otpStore = {};

/* ================= SEND Email OTP ================= */
const sendEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const otp = generateOTP();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Verification Code",
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP is:</p>
        <h1 style="color:blue;">${otp}</h1>
        <p>This OTP is valid for 5 minutes.</p>
      `,
    });

    otpStore[email] = {
      otp: String(otp),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    };

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
};

/* ================= GENERATE OTP ================= */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

/* ================= VERIFY OTP ================= */
const verifyOtp = (options = { respond: false }) => {
  return (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email & OTP required" });
    }

    const storedOtp = otpStore[email];

    if (!storedOtp) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (Date.now() > storedOtp.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ message: "OTP expired" });
    }

    if (storedOtp.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    delete otpStore[email];

    req.otpVerified = true;
    req.verifiedEmail = email;

    if (options.respond) {
      return res.json({ message: "OTP verified successfully" });
    }

    next();
  };
};

const disableUser = async (req, res) => {
  const { id } = req.params;
  if(id==1){
    return res.status(401).json({message:"This is Admin Account"})
  }
  await pool.query(
    "UPDATE users SET is_active = false WHERE id = $1",
    [id]
  );

  res.json({ message: "User disabled successfully" });
};

const enableUser = async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
      "UPDATE users SET is_active = true WHERE id = $1",
      [id]
    );

  res.json({ message: "User enabled successfully" });
};

module.exports = {
  sendEmail,
  verifyOtp,
  disableUser,
  enableUser,
};
