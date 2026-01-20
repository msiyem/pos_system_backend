import pool from "../config/db.js";

function pad(n, width = 6) {
  return n.toString().padStart(width, "0");
}

export async function createSaleService(user_id, data, status = "completed") {
  const {
    customer_id = null,
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

    // ---------- Normal Sale ----------
    if (!Array.isArray(items) || items.length === 0)
      throw new Error("items required");

    let calcSubtotal = 0;
    for (const it of items) {
      const q = Number(it.quantity);
      const p = Number(it.price);
      if (!Number.isFinite(q) || q <= 0)
        throw new Error("Invalid item quantity");
      if (!Number.isFinite(p) || p < 0) throw new Error("Invalid item price");
      calcSubtotal += q * p;
    }

    calcSubtotal = Number(calcSubtotal.toFixed(2));
    const calcTax = Number(Number(tax || 0).toFixed(2));
    const calcDiscount = Number(Number(discount || 0).toFixed(2));
    const calcTotal = Number(
      (calcSubtotal + calcTax - calcDiscount).toFixed(2)
    );

    // const totalPayable = calcTotal + cusDebt;

    const paid_amount =
      status === "pending" || payment_method === "due"
        ? 0
        : Math.min(Number(clientPaid || 0), calcTotal);

    const due_amount = Math.max(calcTotal - paid_amount, 0);

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
      (customer_id, user_id, subtotal, tax, discount, total_amount, paid_amount, due_amount, payment_method,status)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        customer_id,
        user_id,
        calcSubtotal,
        calcTax,
        calcDiscount,
        calcTotal,
        paid_amount,
        due_amount,
        payment_method,
        status,
      ]
    );

    const sale_id = s.insertId;
    const invoicePrefix = status === "pending" ? "P" : "S";
    const invoice_no = `INV-${invoicePrefix}${pad(sale_id, 6)}`;

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

      if (status === "completed") {
        await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [
          quantity,
          product_id,
        ]);

        await conn.query(
          "INSERT INTO inventory_log (product_id, change_qty, reason, reference) VALUES (?,?,?,?)",
          [product_id, -quantity, "SALE", invoice_no]
        );
      }
    }

    if (customer_id && status === "completed") {
      await conn.query(
        "UPDATE customers SET debt = debt + ?,total_orders = total_orders + 1, last_purchased = NOW() WHERE id = ?",
        [due_amount, customer_id]
      );

      await conn.query(
        "INSERT INTO payments (customer_id,sale_id,user_id,amount,payment_type,method,direction,reference_no) VALUES (?,?,?,?,?,?,?,?) ",
        [customer_id,sale_id,user_id,paid_amount,"payment",payment_method,"in",invoice_no]
      )

      if (due_amount > 0) {
        await conn.query(
          `INSERT INTO customer_dues (customer_id, sale_id, due_amount, created_by) VALUES (?,?,?,?)`,
          [customer_id, sale_id, due_amount, user_id]
        );
      }


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

export async function completePendingSaleService(
  sale_id,
  user_id,
  paid_amount = 0,
  payment_method = "cash"
) {
  if (!sale_id) throw new Error("sale_id required");
  if (!user_id) throw new Error("user_id required");

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // ---------- Get sale ----------
    const [[sale]] = await conn.query(
      `SELECT * FROM sales WHERE id = ? FOR UPDATE`,
      [sale_id]
    );

    if (!sale) throw new Error("Sale not found");
    if (sale.status !== "pending")
      throw new Error("Only pending sales can be completed");

    // ---------- Get sale items ----------
    const [items] = await conn.query(
      `SELECT * FROM sale_items WHERE sale_id = ?`,
      [sale_id]
    );

    if (!items.length) throw new Error("No sale items found for this sale");

    // ---------- Stock validation ----------
    for (const it of items) {
      const [[prod]] = await conn.query(
        `SELECT stock FROM products WHERE id = ? FOR UPDATE`,
        [it.product_id]
      );

      if (!prod) throw new Error(`Product not found: ${it.product_id}`);

      if (Number(prod.stock) < it.quantity)
        throw new Error(`Not enough stock for product ID ${it.product_id}`);
    }

    // ---------- Deduct stock + inventory log ----------
    for (const it of items) {
      await conn.query(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
        it.quantity,
        it.product_id,
      ]);

      await conn.query(
        `INSERT INTO inventory_log
        (product_id, change_qty, reason, reference)
        VALUES (?,?,?,?)`,
        [it.product_id, -it.quantity, "SALE", sale.invoice_no]
      );
    }

    // ---------- Payment ----------
    const total = Number(sale.total_amount);
    const paid = Math.min(Number(paid_amount || 0), total);
    const due = Math.max(total - paid, 0);

    // ---------- Update sale ----------
    await conn.query(
      `UPDATE sales
      SET paid_amount = ?,
          due_amount = ?,
          payment_method = ?,
          status = 'completed'
      WHERE id = ?`,
      [paid, due, payment_method, sale_id]
    );

    // ---------- Customer update ----------
    if (sale.customer_id) {
      await conn.query(
        `UPDATE customers
        SET debt = debt + ?,
            total_orders = total_orders + 1,
            last_purchased = NOW()
        WHERE id = ?`,
        [due, sale.customer_id]
      );

      if (due > 0) {
        await conn.query(
          `INSERT INTO customer_dues
          (customer_id, sale_id, due_amount, created_by)
          VALUES (?,?,?,?)`,
          [sale.customer_id, sale_id, due, user_id]
        );
      }
    }

    await conn.commit();

    return {
      success: true,
      message: `Pending sale completed! Invoice No : ${sale.invoice_no}`,
      sale: {
        id: sale_id,
        invoice_no: sale.invoice_no,
        total,
        paid_amount: paid,
        due_amount: due,
        status: "completed",
      },
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getCustomerSaleProductsService(
  user_id,
  customer_id,
  product_id,
  fromDate,
  toDate,
  page=1,
  limit=10,
) {
  const offset = (page-1) *limit;
  let params = [];
  let sql=`SELECT 
    si.product_id,
    si.sale_id,
    s.invoice_no invoice,
    si.quantity,
    si.price,
    si.subtotal,
    DATE_FORMAT(
        CONVERT_TZ(si.created_at,'+00:00','+00:00'),
        '%d-%m-%Y %I:%i %p'
      ) AS created_at,
    p.name AS product_name,
    u.name AS user_name
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  JOIN products p ON p.id = si.product_id
  JOIN users u ON u.id = s.user_id
    WHERE 1=1
  `;

  if (fromDate && toDate) {
    sql += ` AND DATE(si.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  if (customer_id) {
    sql += ` AND s.customer_id = ?`;
    params.push(customer_id);
  }

  if (product_id) {
    sql += ` AND si.product_id = ?`;
    params.push(product_id);
  }

  if (user_id) {
    sql += ` AND u.id = ?`;
    params.push(user_id);
  }

  sql += ` ORDER BY si.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  const [rows] = await pool.query(sql,params);
  return rows;
}

export async function getCustomerPurchasedProductsService({
  customerId,
  fromDate,
  toDate,
  page = 1,
  limit = 1,
}) {
  let params = [customerId];
  const offset = (page - 1) * limit;
  let sql = `
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.image_url AS image,

      COUNT(DISTINCT si.sale_id) AS times_purchased,
      SUM(si.quantity) AS total_quantity,
      SUM(si.quantity * si.price) AS total_amount

    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN products p ON p.id = si.product_id

    WHERE s.customer_id = ?
      AND s.status = 'completed'
  `;

  if (fromDate && toDate) {
    sql += ` AND DATE(s.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  sql += `
    GROUP BY p.id, p.name
    ORDER BY total_quantity DESC LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getCustomerPurchaseSummaryService(
  customerId,
  fromDate,
  toDate
) {
  let params = [customerId];

  let sql = `
    SELECT
      COUNT(DISTINCT s.id) AS totalTimesPurchased,
      COUNT(DISTINCT si.product_id) AS totalProductsPurchased,
      COALESCE(SUM(si.quantity), 0) AS totalQuantity,
      COALESCE(SUM(si.quantity * si.price), 0) AS totalAmount
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    WHERE s.customer_id = ?
      AND s.status = 'completed'
  `;

  if (fromDate && toDate) {
    sql += ` AND DATE(s.created_at) BETWEEN ? AND ? `;
    params.push(fromDate, toDate);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0]; 
}



export async function getSalesService(status) {
  const [rows] = await pool.query(
    `
    SELECT s.*,
    DATE_FORMAT(CONVERT_TZ(s.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS join_at,
    u.name AS shopkeeper, c.name AS customer
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.status = ?
    ORDER BY s.id DESC
  `,
    [status]
  );

  return rows;
}
