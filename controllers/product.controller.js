import pool from "../db.js";
import { hasActiveSubscription } from "./subscription.controller.js";

// Add product
export const addProduct = async (req, res) => {
  const userId = req.user.id;
  const { name, price, quantity, unit, expiry_date } = req.body;

  const subscription = await hasActiveSubscription(userId);
  if (!subscription) {
    return res.status(403).json({ message: "Active subscription required" });
  }

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM products WHERE user_id=$1`,
    [userId]
  );

  const productCount = Number(countRes.rows[0].count);

  // NULL = unlimited
  if (subscription.max_products !== null &&
      productCount >= subscription.max_products) {
    return res.status(403).json({
      message: "Product limit reached for your plan"
    });
  }

  const result = await pool.query(`
    INSERT INTO products
    (user_id,name,price,quantity,unit,expiry_date)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
  `, [
    userId,
    name,
    price,
    quantity,
    unit || 'pcs',
    expiry_date || null
  ]);

  res.json({ message: "Product added", product: result.rows[0] });
};




// Get my products
export const getMyProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id,name,price,quantity,expiry_date,created_at,unit 
       FROM products WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ count: result.rows.length, products: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, price, quantity, expiry_date, unit } = req.body;

    if (!name && !price && !quantity && !expiry_date) return res.status(400).json({ message: "Nothing to update" });

    const result = await pool.query(
      `UPDATE products SET
         name = COALESCE($1,name),
         price = COALESCE($2,price),
         quantity = COALESCE($3,quantity),
         expiry_date = COALESCE($4,expiry_date),
         unit = COALESCE($5,unit)
       WHERE id=$6 AND user_id=$7
       RETURNING *`,
      [name, price, quantity, expiry_date,unit, id, userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product updated", product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update product" });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM products WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete product" });
  }
};
