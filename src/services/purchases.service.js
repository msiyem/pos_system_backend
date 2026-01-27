import pool from "../config/db.js";
function pad(n, width = 6) {
  return n.toString().padStart(width, "0");
}
// Add Purchase & Items
export async function createPurchaseService(user_id, data) {
  const {
    supplier_id,
    items = [],
    total_amount: clientTotal,
    paid_amount: clientPaid = 0,
    payment_method = "cash",
  } = data;

  if (!user_id) throw new Error("user_id required");
  if (!supplier_id) throw new Error("supplier_id required");

  if (!Array.isArray(items) || items.length === 0)
    throw new Error("items required!");

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    //------------calculate subtotal-------
    let calTotal = 0;

    for (const it of items) {
      const q = Number(it.quantity);
      const p = Number(it.price);

      if (!Number.isFinite(q) || q <= 0) throw new Error("Invalid quantity");
      if (!Number.isInteger(q)) throw new Error("Quantity must be integer");
      if (!Number.isFinite(p) || p < 0) throw new Error("Invalid price");

      calTotal += q * p;
    }

    calTotal = Number(calTotal.toFixed(2));

    if (
      typeof clientTotal !== "undefined" &&
      Number(clientTotal).toFixed(2) !== calTotal.toFixed(2)
    ) {
      throw new Error("Total amount mismatch. Please refresh.");
    }

    const allowedMethods = ["cash", "bank", "bkash", "nagad", "due"];
    if (!allowedMethods.includes(payment_method)) {
      throw new Error("Invalid payment method");
    }

    //-------paid & due------
    const paid_amount = Math.min(Number(clientPaid || 0), calTotal);

    const due_amount = Number((calTotal - paid_amount).toFixed(2));

    // insert purchase
    const [p] = await conn.query(
      `INSERT INTO purchases 
      (supplier_id, total_amount, paid_amount, due_amount,user_id) 
      VALUES (?,?,?,?,?)`,
      [supplier_id, calTotal, paid_amount, due_amount, user_id],
    );

    const purchase_id = p.insertId;
    const invoice_no = `INV-P${pad(purchase_id, 6)}`;

    await conn.query("UPDATE purchases SET invoice_no = ? WHERE id = ?", [
      invoice_no,
      purchase_id,
    ]);

    // -------item & stock-----

    for (let item of items) {
      const { product_id, quantity, price } = item;
      const subtotal = Number((quantity * price).toFixed(2));

      //lock stock row
      const [[prod]] = await conn.query(
        "SELECT stock FROM products WHERE id=? FOR UPDATE",
        [product_id],
      );

      if (!prod) throw new Error(`Product not found: ${product_id}`);

      // insert purchase item
      await conn.query(
        ` 
        INSERT INTO purchase_items 
        (purchase_id, product_id, quantity, price, subtotal) 
        VALUES (?,?,?,?,?)`,
        [purchase_id, product_id, quantity, price, subtotal],
      );

      // update stock
      await conn.query(
        `
        UPDATE 
          products 
        SET 
          stock = stock + ? 
        WHERE 
          id = ?`,
        [quantity, product_id],
      );

      await conn.query(
        `
        INSERT INTO inventory_log
        (product_id, change_qty, reason, reference)
        VALUES (?,?,?,?)
        `,
        [product_id, quantity, "PURCHASE", invoice_no],
      );
    }

    //---------supplier payment-----
    if (paid_amount > 0) {
      await conn.query(
        `
          INSERT INTO payments
          (supplier_id, purchase_id, amount, payment_type, direction, method, user_id, reference_no)
          VALUES (?, ?, ?, 'payment', 'out', ?, ?, ?)
        `,
        [
          supplier_id,
          purchase_id,
          paid_amount,
          payment_method,
          user_id,
          invoice_no,
        ],
      );
    }

    //-----supplier due-----
    if (due_amount > 0) {
      await conn.query(
        `INSERT INTO supplier_dues (supplier_id, purchase_id, due_amount, created_by) VALUES (?,?,?,?)`,
        [supplier_id, purchase_id, due_amount, user_id],
      );
    }
    await conn.query(
      `
        UPDATE suppliers
        SET 
          payable = payable + ?, 
          total_supply = total_supply + 1,
          last_transition = NOW()
        WHERE id = ?
        `,
      [due_amount, supplier_id],
    );

    await conn.commit();
    return {
      success: true,
      message: `Purchase completed! Invoice NO: ${invoice_no}`,
      purchase: {
        id: purchase_id,
        invoice_no,
        total: calTotal,
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

export async function getSupplierSupliesProductsService(
  supplier_id,
  fromDate,
  toDate,
  page = 1,
  limit = 10,
) {
  let params = [supplier_id];
  const offset = (page - 1) * limit;
  let sql = `
        SELECT 
          p.id AS product_id,
          p.name AS product_name,
          p.image_url AS image,
          
          COUNT(DISTINCT pi.purchase_id) AS times_supplied,
          SUM(pi.quantity) AS total_quantity,
          SUM(pi.quantity * pi.price) AS total_amount
        FROM purchases ph
        JOIN purchase_items pi ON  
          pi.purchase_id = ph.id
        JOIN products p ON
          p.id = pi.product_id

        WHERE ph.supplier_id = ?
      `;

  if (fromDate && toDate) {
    sql += ` AND DATE(ph.created_at) BETWEEN ? AND ? `;
    params.push(fromDate, toDate);
  }
  sql += `
  GROUP BY p.id,p.name,p.image_url
  ORDER BY total_quantity DESC LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getSupplierSupliesSpecificProductService(
  user_id = null,
  supplier_id,
  product_id,
  fromDate,
  toDate,
  page = 1,
  limit = 10,
) {
  const offset = (page - 1) * limit;
  let params = [];
  let sql = `
  SELECT
    pi.product_id,
    pi.purchase_id,
    ph.invoice_no invoice,
    pi.quantity,
    pi.price,
    DATE_FORMAT(
        CONVERT_TZ(ph.created_at,'+00:00','+00:00'),
        '%d-%m-%Y %I:%i %p'
      ) AS created_at,
    p.name product_name,
    u.name user_name
  FROM 
    purchase_items pi
  JOIN purchases ph ON ph.id = pi.purchase_id
  JOIN products p ON p.id = pi.product_id
  JOIN users u ON u.id = ph.user_id
  WHERE 1=1
    `;

  if (fromDate && toDate) {
    sql += ` AND DATE(ph.created_at) BETWEEN ? AND ? `;
    params.push(fromDate, toDate);
  }
  if (supplier_id) {
    sql += ` AND ph.supplier_id = ? `;
    params.push(supplier_id);
  }
  if (product_id) {
    sql += ` AND pi.product_id = ? `;
    params.push(product_id);
  }
  if (user_id) {
    sql += ` AND u.id = ?`;
    params.push(user_id);
  }
  sql += ` ORDER BY ph.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getSupplierOverallSummaryService(
  supplier_id,
  fromDate,
  toDate,
) {
  let params = [supplier_id];

  let sql = `
    SELECT
      COUNT(DISTINCT ph.id) AS totalTimesPurchased,
      COUNT(DISTINCT pi.product_id) AS totalProductsSupplied,
      COALESCE(SUM(pi.quantity), 0) AS totalQuantity,
      COALESCE(SUM(pi.quantity * pi.price), 0) AS totalAmount
    FROM purchases ph
    JOIN purchase_items pi ON pi.purchase_id = ph.id
    WHERE ph.supplier_id = ?
  `;

  if (fromDate && toDate) {
    sql += ` AND DATE(ph.created_at) BETWEEN ? AND ? `;
    params.push(fromDate, toDate);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0];
}

export async function getSupplierTransactionHistoryService({
  supplier_id,
  fromDate,
  toDate,
  type,
  limit = 10,
  page = 1,
}) {
  const offset = (page - 1) * limit;

  let params = [supplier_id, supplier_id];

  const baseSql = `
    (
      SELECT 
        p.id AS ref_id,
        'Purchase' AS type,
        p.invoice_no AS reference,
        p.total_amount AS amount,
        p.supplier_id,
        s.name AS supplier_name,
        p.user_id,
        'purchase' AS status,
        p.paid_amount AS paid,
        p.due_amount AS due,
        p.payment_method AS method,
        u.name AS created_by,
        DATE_FORMAT(
          CONVERT_TZ(p.created_at,'+00:00','+00:00'),
          '%Y-%m-%d %H:%i:%s'
        ) AS created_at
      FROM purchases p
      JOIN suppliers s ON s.id = p.supplier_id
      JOIN users u ON u.id = p.user_id
      WHERE p.supplier_id = ?
    )

    UNION ALL

    (
      SELECT 
        py.id AS ref_id,
        CASE 
          WHEN py.payment_type = 'advance' THEN 'Advance'
          WHEN py.payment_type = 'due_payment' THEN 'DuePayment'
          ELSE 'Payment'
        END AS type,
        py.reference_no AS reference,
        py.amount,
        py.supplier_id,
        s.name AS supplier_name,
        py.user_id,
        py.payment_type AS status,
        py.amount AS paid,
        NULL AS due,
        py.method AS method,
        u.name AS created_by,
        DATE_FORMAT(
          CONVERT_TZ(py.created_at,'+00:00','+00:00'),
          '%Y-%m-%d %H:%i:%s'
        ) AS created_at
      FROM payments py
      JOIN suppliers s ON s.id = py.supplier_id
      JOIN users u ON u.id = py.user_id
      WHERE py.supplier_id = ?
        AND py.payment_party = 'supplier'
    )
  `;

  let sql = `SELECT * FROM (${baseSql}) t WHERE 1=1`;

  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }

  if (fromDate && toDate) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getSupplierTransactionCount({
  supplierId,
  fromDate,
  toDate,
  type,
}) {
  let params = [supplierId, supplierId];

  const baseSql = `
    (
      SELECT 
        p.id,
        p.created_at,
        'Purchase' AS type
      FROM purchases p
      WHERE p.supplier_id = ?
    )

    UNION ALL

    (
      SELECT 
        py.id,
        py.created_at,
        CASE 
          WHEN py.payment_type = 'due_payment' THEN 'DuePayment'
          WHEN py.payment_type = 'advance' THEN 'Advance'
          ELSE 'Payment'
        END AS type
      FROM payments py
      WHERE py.supplier_id = ?
        AND py.payment_party = 'supplier'
    )
  `;

  let sql = `
    SELECT
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN type = 'Purchase' THEN 1 ELSE 0 END) AS purchase_count,
      SUM(CASE WHEN type = 'Payment' THEN 1 ELSE 0 END) AS payment_count,
      SUM(CASE WHEN type = 'DuePayment' THEN 1 ELSE 0 END) AS duepayment_count,
      SUM(CASE WHEN type = 'Advance' THEN 1 ELSE 0 END) AS advance_count
    FROM (${baseSql}) t
    WHERE 1=1
  `;

  // type filter
  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }

  // date filter
  if (fromDate && toDate) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  const [[row]] = await pool.query(sql, params);
  return row;
}

export async function getSupplierPurchaseItemsService(
  user_id,
  purchaseId,
  supplierId,
) {
  let params = [purchaseId, supplierId];
  let sql = `
    SELECT 
      pi.*,
      pi.subtotal AS total,
      pr.name AS product_name,
      pr.image_url AS image,
      p.invoice_no AS invoice,
      DATE_FORMAT(
        CONVERT_TZ(pi.created_at,'+00:00','+00:00'),
        '%d-%m-%Y %I:%i %p'
      ) AS created_at,
      u.name AS user_name,
      s.name AS supplier
    FROM purchases p
    JOIN purchase_items pi ON pi.purchase_id = p.id
    JOIN products pr ON pr.id = pi.product_id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE 
      p.id = ?
      AND p.supplier_id = ?
    `;

  if (user_id) {
    sql += ` AND p.user_id = ?`;
    params.push(user_id);
  }

  sql += ` ORDER BY pi.id DESC`;

  const [rows] = await pool.query(sql, params);

  return rows;
}


// Get purchase list
export async function getPurchasesService() {
  const [rows] = await pool.query(`
    SELECT p.*, s.name AS supplier
    FROM purchases p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.id DESC
  `);

  return rows;
}
