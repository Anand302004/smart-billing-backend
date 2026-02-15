import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { generateBillingQR, confirmUPIPayment, cashPayment, createBill, getBillById, getBillingHistory, exportBillingPDF } from "../controllers/billing.controller.js";

const router = express.Router();

router.get('/export-pdf', verifyToken, exportBillingPDF);
router.get("/history", verifyToken, getBillingHistory);
router.post("/create", verifyToken, createBill);
router.post("/generate-qr", verifyToken, generateBillingQR);
router.post("/confirm-upi", verifyToken, confirmUPIPayment);
router.post("/cash-payment", verifyToken, cashPayment);
router.get("/:id", verifyToken, getBillById);

export default router;
