import { hasActiveSubscription } from "../controllers/subscription.controller.js";
// import pool from "../db.js";

export const checkSubscription = async (req, res, next) => {
  try {
    const sub = await hasActiveSubscription(req.user.id);

    if (!sub) {
      return res.status(403).json({
        message: "No active subscription"
      });
    }

    req.subscription = sub; // { max_products }
    next();
  } catch (err) {
    console.error("CHECK SUBSCRIPTION ERROR ❌", err);
    res.status(500).json({ message: "Subscription check failed" });
  }
};
