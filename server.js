import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./db.js";
import cookieParser from "cookie-parser";


import authRoutes from "./router/auth.router.js";
import verificationRoutes from "./router/email.verification.js";
import paymentRoutes from "./router/subscription.routes.js";
import adminRoutes from "./router/admin.router.js";
import productRoutes from "./router/product.router.js";
import billingRoutes from "./router/billing.router.js";
import shopsRoutes from "./router/shop.router.js"
import dashboardRoutes from "./router/dashboards.router.js"
import adminDashboardRoutes from "./router/admin.dashboard.router.js"

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:4200", // Angular URL
  credentials: true
}));
app.use(cookieParser());

app.get("/", (req,res)=>res.send("Server running 🚀"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/verification", verificationRoutes);
app.use("/payments", paymentRoutes);
app.use("/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/billing", billingRoutes);
app.use("/shop", shopsRoutes)
app.use("/dashboard",dashboardRoutes)
app.use("/adminDashboard", adminDashboardRoutes)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

