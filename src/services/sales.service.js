import pool from "../config/db.js";

function pad(n, width = 6) {
  return n.toString().padStart(width, "0");
}

export async function createSaleService(data) {
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
  } = data;

  if (!user_id) throw new Error("user_id required");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let cusDebt = 0;
    if (customer_id) {
      const [rows] = await conn.query(
        "SELECT IFNULL(debt,0) AS debt FROM customers WHERE id = ?",
        [customer_id]
      );
      if (rows.length) cusDebt = Number(rows[0].debt);
    }

    // ---------- ONLY due payment ----------
    if ((!Array.isArray(items) || items.length === 0) && customer_id && clientPaid > 0) {
      const newDebt = Math.max(cusDebt - clientPaid, 0);
      await conn.query(
        "UPDATE customers SET debt = ?, last_purchased = NOW() WHERE id = ?",
        [newDebt, customer_id]
      );

      await conn.commit();
      return {
        success: true,
        message: "Due payment received",
        clientPaid,
        remaining_due: newDebt,
      };
    }

    // ---------- Normal Sale ----------
    if (!Array.isArray(items) || items.length === 0)
      throw new Error("items required");

    let calcSubtotal = 0;
    for (const it of items) {
      const q = Number(it.quantity);
      const p = Number(it.price);
      if (!Number.isFinite(q) || q <= 0) throw new Error("Invalid item quantity");
      if (!Number.isFinite(p) || p < 0) throw new Error("Invalid item price");
      calcSubtotal += q * p;
    }

    calcSubtotal = Number(calcSubtotal.toFixed(2));
    const calcTax = Number(Number(tax || 0).toFixed(2));
    const calcDiscount = Number(Number(discount || 0).toFixed(2));
    const calcTotal = Number((calcSubtotal + calcTax - calcDiscount).toFixed(2));

    const totalPayable = calcTotal + cusDebt;
    const paid_amount =
      payment_method === "due"
        ? 0
        : Math.min(Number(clientPaid || 0), totalPayable);

    const paidForSale = paid_amount;
    const paidForDue = Math.max(paid_amount - calcTotal, 0);
    const due_amount =
      Math.max(calcTotal - paidForSale, 0) +
      Math.max(cusDebt - paidForDue, 0);

    if (
      typeof clientSubtotal !== "undefined" &&
      Number(clientSubtotal).toFixed(2) !== calcSubtotal.toFixed(2)
    ) {
      throw new Error("Subtotal mismatch. Please refresh cart.");
    }

    if (
      typeof clientTotal !== "undefined" &&
      Number(clientTotal).toFixed(2) !== calcTotal.toFixed(2)
    ) {
      throw new Error("Total amount mismatch. Please refresh cart.");
    }

    const [s] = await conn.query(
      `INSERT INTO sales 
       (customer_id, user_id, subtotal, tax, discount, total_amount, paid_amount, due_amount, payment_method)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        customer_id,
        user_id,
        calcSubtotal,
        calcTax,
        calcDiscount,
        calcTotal,
        paidForSale,
        due_amount,
        payment_method,
      ]
    );

    const sale_id = s.insertId;
    const invoice_no = `INV-S${pad(sale_id, 6)}`;

    await conn.query("UPDATE sales SET invoice_no = ? WHERE id = ?", [
      invoice_no,
      sale_id,
    ]);

    for (const it of items) {
      const product_id = it.product_id;
      const quantity = Number(it.quantity);
      const price = Number(it.price);
      const itemSubtotal = Number((quantity * price).toFixed(2));

      const [prodRows] = await conn.query(
        "SELECT stock FROM products WHERE id = ? FOR UPDATE",
        [product_id]
      );

      if (!prodRows.length) throw new Error(`Product not found: ${product_id}`);
      if (Number(prodRows[0].stock) < quantity)
        throw new Error(`Not enough stock for product ID ${product_id}`);

      await conn.query(
        "INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal) VALUES (?,?,?,?,?)",
        [sale_id, product_id, quantity, price, itemSubtotal]
      );

      await conn.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [quantity, product_id]
      );

      await conn.query(
        "INSERT INTO inventory_log (product_id, change_qty, reason, reference) VALUES (?,?,?,?)",
        [product_id, -quantity, "SALE", invoice_no]
      );
    }

    if (customer_id) {
      await conn.query(
        "UPDATE customers SET debt = ?, last_purchased = NOW() WHERE id = ?",
        [due_amount, customer_id]
      );
    }

    await conn.commit();

    return {
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
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getSalesService() {
  const [rows] = await pool.query(`
    SELECT s.*,
    DATE_FORMAT(CONVERT_TZ(s.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS join_at,
    u.name AS shopkeeper, c.name AS customer
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.id DESC
  `);

  return rows;
}
