import express from "express";
import {
  getTodaySummary,
  getSalesGraph,
  getAlerts
} from "../controllers/dashboard.controllers.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/today", verifyToken, getTodaySummary);
router.get("/sales-graph", verifyToken, getSalesGraph);
router.get("/alerts", verifyToken, getAlerts);

export default router;
