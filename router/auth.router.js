import express from "express";
const router = express.Router();

import {
  signup,
  login,
  deleteUser,
  getAllUsers,
  updateUsers
} from "../controllers/auth.controller.js";

import {
  verifyToken,
  sendReq,
  isAdmin
} from "../middleware/authMiddleware.js";

import { verifyOtp, disableUser, enableUser } from "../controllers/verification.js";
import { subscribePlan, getSubscriptions, getMySubscription } from "../controllers/subscription.controller.js";

/* ================= AUTH ================= */
router.post("/signup", verifyOtp(), signup);
router.post("/login", login);
router.delete("/delete", verifyToken, deleteUser);
router.put("/disable/:id", verifyToken, isAdmin, disableUser);
router.put("/enable/:id", verifyToken, isAdmin, enableUser);

/* ================= USER ================= */
router.put("/update", verifyToken, updateUsers);
router.get("/profile", verifyToken, sendReq);

/* ================= ADMIN ================= */
router.get("/users", verifyToken, isAdmin, getAllUsers);

/* ================= SUBSCRIPTION ================= */
router.post('/subscribe', verifyToken, subscribePlan);
router.get('/subscriptions', verifyToken, getSubscriptions);
router.get('/subscriptions/my', verifyToken, getMySubscription);


/* 🔹 IMPORTANT: default export */
export default router;
