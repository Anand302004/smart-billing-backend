import pool from "../db.js";

export const getSubscriptions = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscriptions');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
};

export const subscribePlan = async (req, res) => {
  try {
    const { subscription_id } = req.body;
    const userId = req.user.id; // from JWT middleware

    const plan = await pool.query(
      'SELECT * FROM subscriptions WHERE id=$1',
      [subscription_id]
    );

    if (plan.rows.length === 0) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.rows[0].duration_days);

    await pool.query(
      `INSERT INTO user_subscriptions 
       (user_id, subscription_id, start_date, end_date)
       VALUES ($1,$2,$3,$4)`,
      [userId, subscription_id, startDate, endDate]
    );

    res.json({ message: 'Subscription activated successfully' });

  } catch (err) {
    res.status(500).json({ message: 'Subscription failed' });
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
      AND us.end_date >= CURRENT_DATE
    ORDER BY us.end_date DESC
    LIMIT 1
  `, [userId]);

  if (!result.rows.length) {
    return res.status(404).json({ message: "No active subscription" });
  }

  res.json(result.rows[0]);
};
