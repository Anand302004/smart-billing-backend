import express from "express";
import { isAdmin, verifyToken } from "../middleware/authMiddleware.js";
import { getMySubscription, getSubscriptions, getSubscriptionUsers } from "../controllers/subscription.controller.js";
import { generateQR, generateSubscriptionPayment, userConfirmPayment } from "../controllers/payments.controller.js";

const router = express.Router();


router.get("/subscriptions", getSubscriptions);           // GET all plans
router.get("/subscriptions/me", verifyToken, getMySubscription); // GET my active subscription
router.post("/subscription/qr", verifyToken,generateSubscriptionPayment, generateQR); // QR generation

router.post("/confirm-payment",  verifyToken,  userConfirmPayment);

router.get('/subscription-users', verifyToken,isAdmin, getSubscriptionUsers);

export default router;
