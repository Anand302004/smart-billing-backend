import pool from '../db.js';

export const status = async (req, res) => {
  try {

    // ✅ Total Users
    const usersResult = await pool.query(
      `SELECT COUNT(*) FROM users`
    );

    // ✅ Subscription Users
    const subsResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id)
      FROM user_subscriptions
      WHERE payment_status='SUCCESS'
    `);

    // ✅ Pending Payments
    const pendingResult = await pool.query(`
      SELECT COUNT(*)
      FROM payments
      WHERE status='USER_CONFIRMED'
    `);

    // ✅ Recent Users
    const recentUsersResult = await pool.query(`
      SELECT name
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // ✅ Monthly Chart Data (PostgreSQL syntax)
    const monthlyResult = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM start_date) AS month,
        COUNT(*) AS total
      FROM user_subscriptions
      WHERE payment_status='SUCCESS'
      GROUP BY month
      ORDER BY month
    `);

    const system = {
      server: "Running",
      database: "Connected",
      api: "Online"
    };
    res.json({
      totalUsers: Number(usersResult.rows[0].count),
      subscriptionUsers: Number(subsResult.rows[0].count),
      pendingPayments: Number(pendingResult.rows[0].count),
      recentUsers: recentUsersResult.rows,
      monthly: monthlyResult.rows,
      system
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Dashboard error" });
  }
};
