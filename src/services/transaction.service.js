import pool from "../config/db.js";


export async function getAllTransactionHistoryService({
  fromDate,
  toDate,
  type,
  limit = 10,
  page = 1,
}) {
  const offset = (page - 1) * limit;
  let params = [];

  let baseSql = `
    (
      SELECT 
        s.id AS ref_id,
        'Purchased' AS type,
        s.invoice_no AS reference,
        s.total_amount AS amount,
        s.customer_id,
        c.name AS customer_name,
        s.user_id,
        u.name AS seller_name,
        s.created_at
      FROM sales s
      JOIN customers c ON c.id = s.customer_id
      JOIN users u ON u.id = s.user_id
    )

    UNION ALL

    (
      SELECT 
        p.id AS ref_id,
        IF(p.payment_type='due_payment','DuePayment','Payment') AS type,
        p.sale_id AS reference,
        p.amount,
        p.customer_id,
        c.name AS customer_name,
        p.user_id,
        u.name AS seller_name,
        p.created_at
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN users u ON u.id = p.user_id
    )

    UNION ALL

    (
      SELECT 
        r.id AS ref_id,
        'Refund' AS type,
        r.sale_id AS reference,
        r.amount,
        r.customer_id,
        c.name AS customer_name,
        r.user_id,
        u.name AS seller_name,
        r.created_at
      FROM refunds r
      JOIN customers c ON c.id = r.customer_id
      JOIN users u ON u.id = r.user_id
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


export async function getAllTransactionCountService({
  fromDate,
  toDate,
  type,
}) {
  let params = [];

  let baseSql = `
    (
      SELECT s.id, s.created_at, 'Purchased' AS type
      FROM sales s
    )

    UNION ALL

    (
      SELECT p.id, p.created_at,
            IF(p.payment_type='due_payment','DuePayment','Payment') AS type
      FROM payments p
    )

    UNION ALL

    (
      SELECT r.id, r.created_at, 'Refund' AS type
      FROM refunds r
    )
  `;

  let sql = `SELECT COUNT(*) AS total FROM (${baseSql}) t WHERE 1=1`;

  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }

  if (fromDate && toDate) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  const [[row]] = await pool.query(sql, params);
  return row.total;
}


export async function getUserTransactionHistoryService({
  userId,
  fromDate,
  toDate,
  type,
  limit = 10,
  page = 1,
}) {
  // Validation
  if (!userId || !Number.isFinite(userId)) {
    throw new Error("Invalid userId");
  }
  if (page < 1) throw new Error("Page must be >= 1");
  if (limit < 1 || limit > 100) throw new Error("Limit must be between 1-100");

  const offset = (page - 1) * limit;

  let baseSql = `
    (
      SELECT 
        s.id AS ref_id,
        'Sale' AS type,
        s.invoice_no AS reference,
        s.total_amount AS amount,
        s.customer_id,
        c.name AS customer_name,
        s.user_id,
        s.status,
        s.paid_amount AS paid,
        s.due_amount AS due,
        s.payment_method AS method,
        u.name AS seller_name,
        DATE_FORMAT(
          CONVERT_TZ(s.created_at,'+00:00','+00:00'),
          '%Y-%m-%d %H:%i:%s'
        ) AS created_at
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      JOIN users u ON u.id = s.user_id
      WHERE s.user_id = ?
    )

    UNION ALL

    (
      SELECT 
        p.id AS ref_id,
        IF(p.payment_type='due_payment','DuePayment','Payment') AS type,
        p.reference_no AS reference,
        p.amount,
        p.customer_id,
        c.name AS customer_name,
        p.user_id,
        p.payment_type AS status,
        p.amount AS paid,
        NULL AS due,
        p.method AS method,
        u.name AS seller_name,
        DATE_FORMAT(
          CONVERT_TZ(p.created_at,'+00:00','+00:00'),
          '%Y-%m-%d %H:%i:%s'
        ) AS created_at
      FROM payments p
      LEFT JOIN customers c ON c.id = p.customer_id
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
    )

    UNION ALL

    (
      SELECT 
        r.id AS ref_id,
        'Refund' AS type,
        r.sale_id AS reference,
        r.refund_amount AS amount,
        r.customer_id,
        c.name AS customer_name,
        r.user_id,
        NULL AS status,
        r.refund_amount AS paid,
        NULL AS due,
        r.refund_method AS method,
        u.name AS seller_name,
        DATE_FORMAT(
          CONVERT_TZ(r.created_at,'+00:00','+00:00'),
          '%Y-%m-%d %H:%i:%s'
        ) AS created_at
      FROM refunds r
      LEFT JOIN customers c ON c.id = r.customer_id
      JOIN users u ON u.id = r.user_id
      WHERE r.user_id = ?
    )
  `;

  let sql = `SELECT * FROM (${baseSql}) t WHERE 1=1`;
  let params = [userId, userId, userId];

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


export async function getUserTransactionCountService({
  userId,
  fromDate,
  toDate,
  type,
}) {
  if (!userId || !Number.isFinite(userId)) {
    throw new Error("Invalid userId");
  }

  let baseSql = `
    (
      SELECT s.id, s.created_at, s.user_id, 'Sale' AS type
      FROM sales s
      WHERE s.user_id = ?
    )

    UNION ALL

    (
      SELECT p.id, p.created_at, p.user_id,
      IF(p.payment_type='due_payment','DuePayment','Payment') AS type
      FROM payments p
      WHERE p.user_id = ?
    )

    UNION ALL

    (
      SELECT r.id, r.created_at, r.user_id, 'Refund' AS type
      FROM refunds r
      WHERE r.user_id = ?
    )
  `;

  let sql = `
    SELECT
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN type = 'Sale' THEN 1 ELSE 0 END) AS sale_count,
      SUM(CASE WHEN type = 'Payment' THEN 1 ELSE 0 END) AS payment_count,
      SUM(CASE WHEN type = 'DuePayment' THEN 1 ELSE 0 END) AS duepayment_count,
      SUM(CASE WHEN type = 'Refund' THEN 1 ELSE 0 END) AS refund_count
    FROM (${baseSql}) t
    WHERE 1=1
  `;

  let params = [userId, userId, userId];

  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }

  if (fromDate && toDate) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  const [[row]] = await pool.query(sql, params);
  return row;
}


export async function getUserTransactionSummaryService(
  userId,
  fromDate,
  toDate,
) {
  if (!userId || !Number.isFinite(userId)) {
    throw new Error("Invalid userId");
  }

  let start = fromDate?.trim() || null;
  let end = toDate?.trim() || null;
  if (!start || !end) {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    start = past.toISOString().slice(0, 10);
    end = now.toISOString().slice(0, 10);
  }

  const params = [userId, userId, userId];

  let baseSql = `
    (
      SELECT s.id, s.created_at, s.user_id, 'Sale' AS type
      FROM sales s
      WHERE s.user_id = ?
    )

    UNION ALL

    (
      SELECT p.id, p.created_at, p.user_id,
      IF(p.payment_type='due_payment','DuePayment','Payment') AS type
      FROM payments p
      WHERE p.user_id = ?
    )

    UNION ALL

    (
      SELECT r.id, r.created_at, r.user_id, 'Refund' AS type
      FROM refunds r
      WHERE r.user_id = ?
    )
  `;

  let sql = `
    SELECT
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN type = 'Sale' THEN 1 ELSE 0 END) AS sale_count,
      SUM(CASE WHEN type = 'Payment' THEN 1 ELSE 0 END) AS payment_count,
      SUM(CASE WHEN type = 'DuePayment' THEN 1 ELSE 0 END) AS duepayment_count,
      SUM(CASE WHEN type = 'Refund' THEN 1 ELSE 0 END) AS refund_count
    FROM (${baseSql}) t
    WHERE 1=1
  `;

  if (start && end) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(start, end);
  }

  const [[summary]] = await pool.query(sql, params);

  return {
    range: { fromDate: start, toDate: end },
    summary: {
      total_transactions: summary?.total_transactions || 0,
      sale_count: summary?.sale_count || 0,
      payment_count: summary?.payment_count || 0,
      duepayment_count: summary?.duepayment_count || 0,
      refund_count: summary?.refund_count || 0,
    },
  };
}
