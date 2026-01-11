import pool from "../db.js";

export const checkSubscription = async (req, res, next) => {
  const userId = req.user.id;

  const sub = await pool.query(
    `SELECT * FROM user_subscriptions
     WHERE user_id=$1 AND is_active=true AND end_date > NOW()`,
    [userId]
  );

  if (sub.rows.length === 0) {
    return res.status(403).json({ message: 'Subscription expired' });
  }

  req.subscription = sub.rows[0];
  next();
};
