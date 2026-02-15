import pool from "../db.js";

/* ==============================
   TODAY SUMMARY
================================ */
export const getTodaySummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT
        COUNT(DISTINCT b.id) AS "totalBills",
        COALESCE(SUM(b.total_amount), 0) AS "totalSales",
        COALESCE(SUM(bi.quantity), 0) AS "totalItems"
      FROM bills b
      LEFT JOIN bill_items bi ON bi.bill_id = b.id
      WHERE b.user_id = $1
      AND b.created_at::date = CURRENT_DATE
    `, [userId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getTodaySummary error:", err);
    res.status(500).json({ message: "Today summary failed" });
  }
};

/* ==============================
   SALES GRAPH (OPTION BASED)
================================ */
export const getSalesGraph = async (req, res) => {
  try {
    const userId = req.user.id;
    const range = req.query.range || "lifetime";

    let condition = "";
    if (range === "7days") {
      condition = `AND b.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (range === "month") {
      condition = `AND DATE_TRUNC('month', b.created_at) = DATE_TRUNC('month', CURRENT_DATE)`;
    }

    const result = await pool.query(`
      SELECT
        b.created_at::date AS label,
        SUM(b.total_amount) AS total
      FROM bills b
      WHERE b.user_id = $1
      ${condition}
      GROUP BY label
      ORDER BY label
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error("getSalesGraph error:", err);
    res.status(500).json({ message: "Sales graph failed" });
  }
};

/* ==============================
   ALERTS
================================ */
export const getAlerts = async (req, res) => {
  try {
    const userId = req.user.id;

    const lowStock = await pool.query(`
      SELECT id, name, quantity
      FROM products
      WHERE user_id = $1 AND quantity < 10
      ORDER BY quantity
    `, [userId]);

    const expiring = await pool.query(`
      SELECT id, name, expiry_date
      FROM products
      WHERE user_id = $1
      AND expiry_date IS NOT NULL
      AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY expiry_date
    `, [userId]);

    res.json({
      lowStock: lowStock.rows,
      expiring: expiring.rows
    });
  } catch (err) {
    console.error("getAlerts error:", err);
    res.status(500).json({ message: "Alerts failed" });
  }
};
