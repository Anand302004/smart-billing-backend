import pool from '../db.js';

export const confirmSubscriptionPayment = async (req, res) => {
  try {
    const { paymentId } = req.body;

    // 1️⃣ Fetch payment
    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE id = $1 AND status = 'USER_CONFIRMED'`,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found or already processed' });
    }

    const payment = paymentResult.rows[0];

    // 2️⃣ Update payments table (ADD upi_txn_id also)
    await pool.query(
      `UPDATE payments 
       SET status = 'SUCCESS',
           paid_at = NOW(),
           upi_txn_id = COALESCE(upi_txn_id, 'ADMIN_VERIFIED')
       WHERE id = $1`,
      [paymentId]
    );

    // 3️⃣ Insert into user_subscriptions WITH payment info
    await pool.query(
      `INSERT INTO user_subscriptions
       (user_id, subscription_id, start_date, end_date,
        payment_status, payment_txn_id, payment_method, paid_at)
       SELECT
         $1,
         s.id,
         NOW(),
         NOW() + (s.duration_days || ' days')::INTERVAL,
         'SUCCESS',
         p.upi_txn_id,
         'UPI',
         NOW()
       FROM subscriptions s
       JOIN payments p ON p.id = $3
       WHERE s.id = $2`,
      [
        payment.user_id,
        payment.subscription_id,
        paymentId
      ]
    );

    res.json({ message: 'Payment approved & subscription activated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Admin approval failed' });
  }
};

export const getPendingPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         p.id,
         p.user_id,
         u.name AS user_name,
         p.subscription_id,
         p.amount,
         p.status,
         p.created_at
       FROM payments p
       JOIN users u ON p.user_id = u.id
       WHERE p.status = 'USER_CONFIRMED'
       ORDER BY p.created_at ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch pending payments' });
  }
};

export const rejectRequest= async(req, res)=>{
  const {paymentId}=req.params
   try{
     await pool.query(
      `DELETE FROM payments WHERE id=$1`,
      [paymentId]
    );

    return res.json({ message: "Request Deleted Successfully" });

  } catch (error) {
    console.error("Request Rejected error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

