import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const {
    invoice_no,
    customer_id,
    user_id,
    items,
    subtotal,
    tax,
    discount,
    total_amount,
    paid_amount,
    payment_method,
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // sales table entry
    const [s] = await conn.query(
      `INSERT INTO sales (customer_id, user_id, subtotal, tax, discount, total_amount, paid_amount, due_amount, payment_method)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        customer_id,
        user_id,
        subtotal,
        tax || 0,
        discount,
        total_amount,
        paid_amount,
        total_amount - paid_amount,
        payment_method,
      ]
    );
    const sale_id = s.insertId;
    const invoice_no = `INV-S${sale_id}`;
    await conn.query("UPDATE sales SET invoice_no = ? WHERE id = ?", [
      invoice_no,
      sale_id,
    ]);

    for (let item of items) {
      const { product_id, quantity, price } = item;
      const subtotal = quantity * price;

      // sale_items entry
      await conn.query(
        "INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal) VALUES (?,?,?,?,?)",
        [sale_id, product_id, quantity, price, subtotal]
      );

      // reduce stock
      await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [
        quantity,
        product_id,
      ]);

      // inventory log
      await conn.query(
        "INSERT INTO inventory_log (product_id, change_qty, reason, reference) VALUES (?,?,?,?)",
        [product_id, -quantity, "SALE", invoice_no]
      );
    }

    await conn.commit();
    res.json({ message: "Sale completed", sale_id, invoice_no });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed" });
  } finally {
    conn.release();
  }
});

// Get Sales List
router.get("/", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT s.*,
    DATE_FORMAT(CONVERT_TZ(s.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS join_at,
    u.name AS shopkeeper, c.name AS customer
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.id DESC
  `);
  res.json(rows);
});

export default router;
