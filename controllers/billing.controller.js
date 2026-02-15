import pool from "../db.js";
import { hasActiveSubscription } from "./subscription.controller.js";
import QRCode from "qrcode";
import PDFDocument from 'pdfkit';

/* ===============================
   CREATE BILL
================================ */
export const createBill = async (req, res) => {
  const userId = req.user.id;
  const { items, discount_percent = 0 } = req.body;

  // 1️⃣ Subscription check
  const active = await hasActiveSubscription(userId);
  if (!active) {
    return res.status(403).json({
      message: "Active subscription required to create bill"
    });
  }

  // 2️⃣ Shop check
  const shopRes = await pool.query(
    `SELECT id FROM shops WHERE user_id=$1`,
    [userId]
  );

  if (shopRes.rows.length === 0) {
    return res.status(400).json({
      message: "Please add shop details before billing"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const billRes = await client.query(
      `INSERT INTO bills (user_id, discount_percent)
       VALUES ($1,$2)
       RETURNING id`,
      [userId, discount_percent]
    );

    const billId = billRes.rows[0].id;
    let total = 0;

    for (const item of items) {
      const pRes = await client.query(
        `SELECT * FROM products WHERE id=$1 AND user_id=$2`,
        [item.product_id, userId]
      );

      if (!pRes.rows.length) {
        throw new Error("Product not found");
      }

      const p = pRes.rows[0];

      if (Number(p.quantity) < Number(item.quantity)) {
        throw new Error(`Insufficient stock for ${p.name}`);
      }

      const itemTotal = Number(p.price) * Number(item.quantity);
      total += itemTotal;

      await client.query(
        `INSERT INTO bill_items
         (bill_id, product_id, quantity, unit, price, total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [billId, p.id, item.quantity, p.unit, p.price, itemTotal]
      );

      await client.query(
        `UPDATE products
         SET quantity = quantity - $1
         WHERE id=$2`,
        [item.quantity, p.id]
      );
    }

    const discountAmount = (total * discount_percent) / 100;
    const finalTotal = total - discountAmount;

    await client.query(
      `UPDATE bills
       SET total_amount=$1,
           discount_amount=$2
       WHERE id=$3`,
      [finalTotal, discountAmount, billId]
    );

    await client.query("COMMIT");

    res.json({
      billId,
      total: finalTotal
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};

/* ===============================
   GENERATE UPI QR
================================ */
export const generateBillingQR = async (req, res) => {
  try {
    const userId = req.user.id;
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({ message: "billId required" });
    }

    // 1️⃣ Bill validation + amount fetch
    const billRes = await pool.query(
      `SELECT id, total_amount FROM bills
       WHERE id=$1 AND user_id=$2`,
      [billId, userId]
    );

    if (billRes.rows.length === 0) {
      return res.status(404).json({ message: "Bill not found" });
    }

    const amount = billRes.rows[0].total_amount;

    // 2️⃣ Shop UPI fetch
    const shopRes = await pool.query(
      `SELECT shop_name, upi_id FROM shops WHERE user_id=$1`,
      [userId]
    );

    if (
      shopRes.rows.length === 0 ||
      !shopRes.rows[0].upi_id
    ) {
      return res.status(400).json({
        message: "Shop UPI ID not configured"
      });
    }

    const { upi_id, shop_name } = shopRes.rows[0];

    // 3️⃣ Create payment record
    const payRes = await pool.query(
      `INSERT INTO customer_payments
       (user_id, bill_id, amount, payment_mode)
       VALUES ($1,$2,$3,'UPI')
       RETURNING id`,
      [userId, billId, amount]
    );

    const paymentId = payRes.rows[0].id;

    const upiString =
      `upi://pay?pa=${upi_id}` +
      `&pn=${encodeURIComponent(shop_name)}` +
      `&am=${amount}` +
      `&cu=INR` +
      `&tn=BILL_${paymentId}`;

    const qrCode = await QRCode.toDataURL(upiString);

    res.json({
      paymentId,
      amount,
      qrCode,
      status: "PENDING"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "QR generation failed" });
  }
};

/* ===============================
   CONFIRM UPI PAYMENT
================================ */
export const confirmUPIPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const { paymentId, upi_txn_id } = req.body;
    const userId = req.user.id;

    if (!paymentId || !upi_txn_id) {
      return res.status(400).json({
        message: "paymentId & upi_txn_id required"
      });
    }

    await client.query("BEGIN");

    // 1️⃣ Fetch payment
    const payRes = await client.query(
      `SELECT * FROM customer_payments WHERE id=$1`,
      [paymentId]
    );

    if (payRes.rows.length === 0) {
      throw new Error("Payment not found");
    }

    const payment = payRes.rows[0];

    // 🔐 Ownership check
    if (payment.user_id !== userId) {
      throw new Error("Unauthorized payment access");
    }

    if (payment.status !== "PENDING") {
      throw new Error("Payment already processed");
    }

    // 2️⃣ Fetch bill
    const billRes = await client.query(
      `SELECT * FROM bills WHERE id=$1`,
      [payment.bill_id]
    );

    const bill = billRes.rows[0];

    if (bill.payment_status === "PAID") {
      throw new Error("Bill already paid");
    }

    // 3️⃣ Amount validation
    if (Number(payment.amount) !== Number(bill.total_amount)) {
      throw new Error("Amount mismatch");
    }

    // 4️⃣ Duplicate UPI txn check
    const dupTxn = await client.query(
      `SELECT id FROM customer_payments WHERE upi_txn_id=$1`,
      [upi_txn_id]
    );

    if (dupTxn.rows.length > 0) {
      throw new Error("Duplicate UPI transaction");
    }

    // 5️⃣ Mark payment SUCCESS
    await client.query(
      `UPDATE customer_payments
       SET status='SUCCESS',
           upi_txn_id=$1
       WHERE id=$2`,
      [upi_txn_id, paymentId]
    );

    // 6️⃣ Mark bill PAID
    await client.query(
      `UPDATE bills
       SET payment_status='PAID'
       WHERE id=$1`,
      [bill.id]
    );

    await client.query("COMMIT");

    res.json({ message: "UPI Payment Verified & Confirmed" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPI CONFIRM ERROR:", err.message);
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};

/* ===============================
   CASH PAYMENT
================================ */
export const cashPayment = async (req, res) => {
  const { billId } = req.body;
  const userId = req.user.id;

  const billRes = await pool.query(
    `SELECT * FROM bills WHERE id=$1 AND user_id=$2`,
    [billId, userId]
  );

  if (billRes.rows.length === 0) {
    return res.status(404).json({ message: "Bill not found" });
  }

  const bill = billRes.rows[0];

  if (bill.payment_status === "PAID") {
    return res.status(400).json({ message: "Bill already paid" });
  }

  await pool.query(
    `INSERT INTO customer_payments
     (user_id, bill_id, amount, payment_mode, status)
     VALUES ($1,$2,$3,'CASH','SUCCESS')`,
    [userId, billId, bill.total_amount]
  );

  await pool.query(
    `UPDATE bills
     SET payment_status='PAID'
     WHERE id=$1`,
    [billId]
  );

  res.json({ message: "Cash payment confirmed" });
};

/* ===============================
   GET BILL FOR PRINT
================================ */
export const getBillById = async (req, res) => {
  const userId = req.user.id;
  const billId = req.params.id;

  // Bill + items
  const billRes = await pool.query(
    `
    SELECT b.id, b.total_amount, b.discount_amount,
           b.discount_percent, b.payment_status,
           b.created_at
    FROM bills b
    WHERE b.id = $1 AND b.user_id = $2
    `,
    [billId, userId]
  );

  if (billRes.rows.length === 0) {
    return res.status(404).json({ message: "Bill not found" });
  }

  const itemsRes = await pool.query(
    `
    SELECT p.name, bi.quantity, bi.price, bi.total
    FROM bill_items bi
    JOIN products p ON p.id = bi.product_id
    WHERE bi.bill_id = $1
    `,
    [billId]
  );

  res.json({
    ...billRes.rows[0],
    items: itemsRes.rows
  });
};

/* ===============================
   BILLING HISTORY
================================ */
export const getBillingHistory = async (req, res) => {
  const userId = req.user.id;
  let { from, to, mode } = req.query;

  from = from || null;
  to = to || null;
  mode = mode || null;

  const result = await pool.query(
  `
  SELECT b.id,
         b.total_amount,
         b.discount_amount,
         b.payment_status,
         b.created_at,
         cp.payment_mode
  FROM bills b
  LEFT JOIN customer_payments cp
    ON cp.bill_id = b.id
  WHERE b.user_id = $1
    AND ($2::date IS NULL OR b.created_at::date >= $2::date)
    AND ($3::date IS NULL OR b.created_at::date <= $3::date)
    AND ($4::text IS NULL OR cp.payment_mode = $4::text)
  ORDER BY b.created_at DESC
  `,
  [userId, from, to, mode]
);


  res.json(result.rows);
};

export const exportBillingPDF = async (req, res) => {
  try {
    const userId = req.user.id;

    let { from, to, mode } = req.query;

    // 🚨 CRITICAL FIX
    if (from === "null") from = null;
    if (to === "null") to = null;
    if (mode === "null") mode = null;

    let conditions = [`b.user_id = $1`];
    let values = [userId];
    let idx = 2;

    if (from) {
      conditions.push(`b.created_at >= $${idx}`);
      values.push(from);
      idx++;
    }

    if (to) {
      conditions.push(`b.created_at <= $${idx}`);
      values.push(to);
      idx++;
    }

    if (mode) {
      conditions.push(`cp.payment_mode = $${idx}`);
      values.push(mode);
      idx++;
    }

    const query = `
      SELECT 
        b.id,
        b.created_at,
        b.total_amount,
        b.payment_status,
        cp.payment_mode
      FROM bills b
      LEFT JOIN customer_payments cp ON cp.bill_id = b.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(query, values);

    /* ===== PDF ===== */
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=billing-history.pdf"
    );

    doc.pipe(res);

    doc.fontSize(18).text("Billing History", { align: "center" });
    doc.moveDown();

    result.rows.forEach(b => {
      doc.fontSize(11)
        .text(`Bill #${b.id}`)
        .text(`Date: ${new Date(b.created_at).toLocaleString()}`)
        .text(`Mode: ${b.payment_mode || "-"}`)
        .text(`Amount: ₹${b.total_amount}`)
        .text(`Status: ${b.payment_status}`)
        .moveDown();
    });

    doc.end();

  } catch (err) {
    console.error("EXPORT PDF ERROR:", err);
    res.status(500).json({ message: "PDF export failed" });
  }
};

