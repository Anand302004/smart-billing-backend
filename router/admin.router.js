import express from "express";
import { confirmSubscriptionPayment, getPendingPayments, rejectRequest } from "../controllers/admin.controllers.js";
import { isAdmin, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post('/confirm-subscription-payment', verifyToken,isAdmin, confirmSubscriptionPayment);
router.get('/pending-payments', verifyToken,isAdmin, getPendingPayments);
router.delete('/rejected-request/:paymentId',verifyToken,isAdmin,rejectRequest)

export default router;
