// routes/sales.js  (replace your existing POST / handler with this)
import express from "express";
import pool from "../db.js";

const router = express.Router();

function pad(n, width = 6) {
  return n.toString().padStart(width, "0");
}

router.post("/", async (req, res) => {
  const {
    customer_id = null,
    user_id,
    items = [],
    subtotal: clientSubtotal,
    tax = 0,
    discount = 0,
    total_amount: clientTotal,
    paid_amount: clientPaid = 0,
    payment_method = "cash",
  } = req.body;
  


  if (!user_id) return res.status(400).json({ error: "user_id required" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Load customer previous debt
    let cusDebt = 0;
    if (customer_id) {
      const [rows] = await conn.query("SELECT IFNULL(debt,0) AS debt FROM customers WHERE id = ?", [customer_id]);
      if (rows.length) cusDebt = Number(rows[0].debt);
    }

    // ---------- ONLY due payment ----------
    if ((!Array.isArray(items) || items.length === 0) && customer_id>0 && clientPaid > 0) {
      // Reduce customer's debt
      const newDebt = Math.max(cusDebt - clientPaid, 0);
      await conn.query(
        "UPDATE customers SET debt = ?, last_purchased = NOW() WHERE id = ?",
        [newDebt, customer_id]
      );

      await conn.commit();
      return res.json({
        success: true,
        message: "Due payment received",
        clientPaid,
        remaining_due: newDebt,
      });
    }

        // ---------- Normal Sale ----------
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "items required" });

    // Recalculate subtotal from items (server-truth)
    let calcSubtotal = 0;
    for (const it of items) {
      const q = Number(it.quantity);
      const p = Number(it.price);
      if (!Number.isFinite(q) || q <= 0) throw new Error("Invalid item quantity");
      if (!Number.isFinite(p) || p < 0) throw new Error("Invalid item price");
      calcSubtotal += q * p;
    }
    // Normalize numbers
    calcSubtotal = Number(calcSubtotal.toFixed(2));
    const calcTax = Number(Number(tax || 0).toFixed(2));
    const calcDiscount = Number(Number(discount || 0).toFixed(2));

    // server total
    const calcTotal = Number((calcSubtotal + calcTax - calcDiscount).toFixed(2));
    const totalPayable = calcTotal + cusDebt;

    const paid_amount = payment_method === "due" ? 0 : Math.min(Number(clientPaid || 0), totalPayable);
    // Split paid_amount between current sale and previous due
    const paidForSale = paid_amount;
    const paidForDue = Math.max(paid_amount - calcTotal, 0);

    // Calculate due for current sale + remaining previous due
    const due_amount = Math.max(calcTotal - paidForSale, 0) + Math.max(cusDebt - paidForDue, 0);

    // Client validation
    if (typeof clientSubtotal !== "undefined" && Number(clientSubtotal).toFixed(2) !== calcSubtotal.toFixed(2)) {
      throw new Error("Subtotal mismatch. Please refresh cart.");
    }
    if (typeof clientTotal !== "undefined" && Number(clientTotal).toFixed(2) !== calcTotal.toFixed(2)) {
      throw new Error("Total amount mismatch. Please refresh cart.");
    }

    // Insert sale master
    const [s] = await conn.query(
      `INSERT INTO sales 
       (customer_id, user_id, subtotal, tax, discount, total_amount, paid_amount, due_amount, payment_method)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [customer_id, user_id, calcSubtotal, calcTax, calcDiscount, calcTotal, paidForSale, due_amount, payment_method]
    );

    const sale_id = s.insertId;
    const invoice_no = `INV-S${pad(sale_id, 6)}`;

    await conn.query("UPDATE sales SET invoice_no = ? WHERE id = ?", [invoice_no, sale_id]);

    // For each item: lock product row, check stock, insert sale_item, update stock, log inventory
    for (const it of items) {
      const product_id = it.product_id;
      const quantity = Number(it.quantity);
      const price = Number(it.price);
      const itemSubtotal = Number((quantity * price).toFixed(2));

      // Lock the product row to avoid race condition
      const [prodRows] = await conn.query("SELECT stock, name FROM products WHERE id = ? FOR UPDATE", [product_id]);
      if (!prodRows.length) throw new Error(`Product not found: ${product_id}`);
      const stockNow = Number(prodRows[0].stock);
      if (stockNow < quantity) throw new Error(`Not enough stock for product ID ${product_id}`);

      // Insert sale item
      await conn.query(
        "INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal) VALUES (?,?,?,?,?)",
        [sale_id, product_id, quantity, price, itemSubtotal]
      );

      // Reduce stock
      await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, product_id]);

      // Inventory log
      await conn.query(
        "INSERT INTO inventory_log (product_id, change_qty, reason, reference) VALUES (?,?,?,?)",
        [product_id, -quantity, "SALE", invoice_no]
      );
    }

    // Update customer's debt if customer exists and there is a due
    if (customer_id) {
      // update last purchased even if no due
      await conn.query("UPDATE customers SET debt = ?, last_purchased = NOW() WHERE id = ?", [
        due_amount,
        customer_id,
      ]);
    }

    await conn.commit();

    // Return useful sale summary
    res.json({
      success: true,
      message: `Sale completed! Invoice No : ${invoice_no}`,
      sale: {
        id: sale_id,
        invoice_no,
        subtotal: calcSubtotal,
        tax: calcTax,
        discount: calcDiscount,
        total: calcTotal,
        paid_amount,
        due_amount,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("Sale error:", err);
    res.status(400).json({ error: err.message || "Sale failed" });
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
