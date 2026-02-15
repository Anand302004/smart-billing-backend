import express from "express";
const router = express.Router();

import {
  signup,
  login,
  deleteUser,
  getAllUsers,
  updateUsers,
  refreshAccessToken,
  logout
} from "../controllers/auth.controller.js";

import {
  verifyToken,
  isAdmin
} from "../middleware/authMiddleware.js";

import { verifyOtp, disableUser, enableUser } from "../controllers/verification.js";

/* ================= AUTH ================= */
router.post("/signup", verifyOtp(), signup);
router.post("/login", login);
router.delete("/delete", verifyToken, deleteUser);
router.put("/disable/:id", verifyToken, isAdmin, disableUser);
router.put("/enable/:id", verifyToken, isAdmin, enableUser);

/* ================= USER ================= */
router.put("/update", verifyToken, updateUsers);

/* ================= ADMIN ================= */
router.get("/users", verifyToken, isAdmin, getAllUsers);

router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);


/* 🔹 IMPORTANT: default export */
export default router;
