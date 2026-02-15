import pool from "../db.js";
import { hasActiveSubscription } from "./subscription.controller.js";
import QRCode from "qrcode";

/**
 * GET SHOP
 */
export const getShop = async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(
    `SELECT id, shop_name, address, upi_id, created_at, mobile_number
     FROM shops
     WHERE user_id = $1`,
    [userId]
  );

  res.json(result.rows[0] || null);
};

/**
 * CREATE SHOP (ONLY ONCE)
 */
export const createShop = async (req, res) => {
  const userId = req.user.id;
  const { shop_name, address, upi_id, mobile_number } = req.body;

  if (!shop_name || !upi_id) {
    return res.status(400).json({
      message: "Shop name & UPI ID required"
    });
  }

  const active = await hasActiveSubscription(userId);
  if (!active) {
    return res.status(403).json({
      message: "Activate subscription to add shop"
    });
  }

  const existing = await pool.query(
    `SELECT id FROM shops WHERE user_id = $1`,
    [userId]
  );

  if (existing.rows.length > 0) {
    return res.status(400).json({
      message: "Shop already created. You can only update it."
    });
  }

  await pool.query(
    `INSERT INTO shops (user_id, shop_name, address, upi_id, mobile_number)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, shop_name, address || null, upi_id, mobile_number]
  );

  res.json({ message: "Shop created successfully" });
};

/**
 * UPDATE SHOP
 */
export const updateShop = async (req, res) => {
  const userId = req.user.id;
  const { shop_name, address, upi_id, mobile_number } = req.body;

  if (!shop_name || !upi_id) {
    return res.status(400).json({
      message: "Shop name & UPI ID required"
    });
  }

  const result = await pool.query(
    `UPDATE shops
     SET shop_name = $1,
         address = $2,
         upi_id = $3,
         mobile_number =$4
     WHERE user_id = $5`,
    [shop_name, address || null, upi_id, mobile_number, userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Shop not found"
    });
  }

  res.json({ message: "Shop updated successfully" });
};
