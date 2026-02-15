import express from "express";
import { status } from "../controllers/admin.dashboard.controllers.js";
import { isAdmin, verifyToken } from "../middleware/authMiddleware.js";

const router =express.Router();

router.get("/stats",verifyToken,isAdmin, status );

export default router;