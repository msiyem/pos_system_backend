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

  // 🔍 Type filter (Purchased / Payment / DuePayment / Refund)
  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }

  // 📅 Date filter
  if (fromDate && toDate) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  // 🔢 Pagination
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

  // 🔍 type filter
  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }

  // 📅 date filter
  if (fromDate && toDate) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  const [[row]] = await pool.query(sql, params);
  return row.total;
}
