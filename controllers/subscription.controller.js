import pool from "../db.js";

export const getSubscriptions = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscriptions');
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
};

export const getMySubscription = async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(`
    SELECT 
      s.plan_name,
      s.max_products,
      us.start_date,
      us.end_date
    FROM user_subscriptions us
    JOIN subscriptions s ON s.id = us.subscription_id
    WHERE us.user_id = $1
      AND us.end_date > NOW()
    ORDER BY us.end_date DESC
    LIMIT 1
  `, [userId]);

  if (!result.rows.length) {
    return res.status(404).json({ message: "No active subscription" });
  }

  res.json(result.rows[0]);
};



export const hasActiveSubscription = async (userId) => {
  const result = await pool.query(`
    SELECT s.max_products
    FROM user_subscriptions us
    JOIN subscriptions s ON s.id = us.subscription_id
    WHERE us.user_id = $1
      AND us.end_date > NOW()
    ORDER BY us.end_date DESC
    LIMIT 1
  `, [userId]);

  if (!result.rows.length) return null;
  return result.rows[0]; // { max_products }
};



export const getSubscriptionUsers = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        s.plan_name,
        us.start_date,
        us.end_date,
        us.payment_status
      FROM user_subscriptions us
      JOIN users u 
        ON u.id = us.user_id
      JOIN subscriptions s 
        ON s.id = us.subscription_id
      WHERE us.payment_status = 'SUCCESS'
      ORDER BY us.id DESC
    `);

    res.json({
      users: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};




