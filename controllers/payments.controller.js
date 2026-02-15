import pool from '../db.js';
import QRCode from 'qrcode';
import dotenv from "dotenv";
dotenv.config(); 
/* ================= GENERATE QR ================= */
export const generateQR = async (req, res) => {
  try {
    const payment = req.payment; // 👈 middleware मधून आलेला

    if (!payment) {
      return res.status(400).json({ message: 'Payment not found' });
    }

    const amount = payment.amount;
    const paymentId = payment.id;
    const UPI=process.env.UPI

    const upiString =
      `upi://pay?pa=${UPI}&pn=SmartBilling&am=${amount}&cu=INR&tn=PAY_${paymentId}`;

    const qrCode = await QRCode.toDataURL(upiString);

    res.json({
      paymentId,
      amount,
      qrCode
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'QR generation failed' });
  }
};

export const generateSubscriptionPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subscription_id } = req.body;

    // 1️⃣ User चा active subscription (price)
    const activeSub = await pool.query(
      `SELECT s.price
       FROM user_subscriptions us
       JOIN subscriptions s ON us.subscription_id = s.id
       WHERE us.user_id = $1
         AND us.end_date > NOW()
       ORDER BY us.start_date DESC
       LIMIT 1`,
      [userId]
    );

    // 2️⃣ Requested subscription
    const newSub = await pool.query(
      `SELECT id, price FROM subscriptions WHERE id = $1`,
      [subscription_id]
    );

    if (newSub.rows.length === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // 3️⃣ BLOCK duplicate / downgrade
    if (
      activeSub.rows.length > 0 &&
      activeSub.rows[0].price >= newSub.rows[0].price
    ) {
      return res.status(400).json({
        message: 'You already have this plan or a higher plan'
      });
    }

    // 4️⃣ Create payment (ONLY ONCE)
    const payment = await pool.query(
      `INSERT INTO payments (user_id, subscription_id, amount, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING *`,
      [userId, subscription_id, newSub.rows[0].price]
    );

    // 5️⃣ Pass to QR middleware
    req.payment = payment.rows[0];
    next();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Payment initiation failed' });
  }
};

/* ================= USER CONFIRM ================= */
export const userConfirmPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentId } = req.body;

    const payment = await pool.query(
      `SELECT * FROM payments
       WHERE id=$1 AND user_id=$2 AND status='PENDING'`,
      [paymentId, userId]
    );

    if (!payment.rows.length) {
      return res.status(404).json({ message: 'Invalid payment' });
    }

    await pool.query(
      `UPDATE payments SET status='USER_CONFIRMED' WHERE id=$1`,
      [paymentId]
    );

    res.json({ message: 'Waiting for admin approval' });

  } catch {
    res.status(500).json({ message: 'Confirmation failed' });
  }
};
