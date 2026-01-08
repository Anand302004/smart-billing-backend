const nodemailer = require('nodemailer')
require("dotenv").config();

//SMTP server Connection to allow send Email
const transporter= nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const otp = generateOTP();

    //send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Verification Code",
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP is:</p>
        <h1 style="color:blue;">${otp}</h1>
        <p>This OTP is valid for 2 minutes.</p>
      `,
    });

    // ✅ store OTP only if email sent successfully
    otpStore[email] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, //otp expaire in 5 min
    };

    res.json({ message: "Email sent successfully" });

  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
};

//OTP gernerate 
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000); // 6 digit OTP
};

//otp tempary store krto
const otpStore = {};

const verifyOtp = (options = { respond: false }) => {
  return (req, res, next) => {
    const { email, otp } = req.body;
    const storedOtpData = otpStore[email];

    if (!storedOtpData) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (Date.now() > storedOtpData.expiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (storedOtpData.otp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    delete otpStore[email];
    req.otpVerified = true;
    req.verifiedEmail = email;

    // 🔥 condition-wise behaviour
    if (options.respond) {
      return res.json({ message: "OTP verified successfully" });
    }

    next();
  };
};



module.exports = {sendEmail, verifyOtp}