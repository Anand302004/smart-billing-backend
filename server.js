import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./db.js";
import authRoutes from "./router/auth.router.js";
import verificationRoutes from "./router/email.verification.js";

dotenv.config();  // 🔹 top

const app = express();
app.use(express.json());
app.use(cors());

// Check Server Run
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/verification", verificationRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000 ✅");
});
