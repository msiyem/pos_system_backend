import pool from "../config/db.js";

/**
 * Get customer payment analysis
 */
export async function getCustomerPaymentAnalysisService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  const sql = `
    SELECT
      c.id,
      c.name AS customer_name,
      c.phone,
      COUNT(DISTINCT s.id) AS total_purchases,
      SUM(s.total_amount) AS total_spent,
      SUM(s.paid_amount) AS amount_paid,
      SUM(s.due_amount) AS outstanding_due,
      MAX(s.created_at) AS last_purchase_date
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id
    WHERE DATE(s.created_at) BETWEEN ? AND ? OR s.id IS NULL
    GROUP BY c.id, c.name, c.phone
    HAVING total_purchases > 0 OR outstanding_due > 0
    ORDER BY outstanding_due DESC, total_spent DESC
  `;

  const [rows] = await pool.query(sql, [startDate, endDate]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    customer_analysis: rows.map((row) => ({
      customer_id: row.id,
      customer_name: row.customer_name,
      phone: row.phone,
      total_purchases: row.total_purchases,
      total_spent: parseFloat(row.total_spent || 0).toFixed(2),
      amount_paid: parseFloat(row.amount_paid || 0).toFixed(2),
      outstanding_due: parseFloat(row.outstanding_due || 0).toFixed(2),
      last_purchase_date: row.last_purchase_date,
    })),
  };
}

/**
 * COMPREHENSIVE CUSTOMER ANALYSIS - SIMPLIFIED
 * 5 Essential Features (Industry Standard)
 */
export async function getComprehensiveCustomerAnalysisService(
  fromDate,
  toDate,
) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  try {
    // 1. OVERVIEW
    const overviewSql = `
      SELECT
        COUNT(DISTINCT c.id) AS total_customers,
        COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN c.id END) AS active_customers,
        COUNT(DISTINCT CASE WHEN DATE(c.join_at) BETWEEN ? AND ? THEN c.id END) AS new_customers,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.due_amount), 0) AS total_outstanding,
        COUNT(DISTINCT CASE WHEN s.due_amount > 0 THEN c.id END) AS customers_with_dues,
        COUNT(DISTINCT s.id) AS total_transactions
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
    `;

    // 2. TOP 10 CUSTOMERS
    const topCustomersSql = `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        COUNT(s.id) AS total_purchases,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.paid_amount), 0) AS total_paid,
        COALESCE(SUM(s.due_amount), 0) AS total_due,
        COALESCE(AVG(s.total_amount), 0) AS avg_order_value,
        MAX(s.created_at) AS last_purchase_date
      FROM customers c
      JOIN sales s ON c.id = s.customer_id AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_revenue DESC
      LIMIT 10
    `;

    // 4. LONG TIME DUE CUSTOMERS (Best Practice: Aging Buckets)
    const longDueCustomersSql = `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        COUNT(s.id) AS total_purchases,
        COALESCE(SUM(s.due_amount), 0) AS total_due,
        MIN(s.created_at) AS oldest_due_date,
        MAX(s.created_at) AS latest_due_date,
        DATEDIFF(?, MIN(s.created_at)) AS days_overdue,
        CASE
          WHEN DATEDIFF(?, MIN(s.created_at)) > 180 THEN '180+ days'
          WHEN DATEDIFF(?, MIN(s.created_at)) > 90 THEN '91-180 days'
          WHEN DATEDIFF(?, MIN(s.created_at)) > 60 THEN '61-90 days'
          WHEN DATEDIFF(?, MIN(s.created_at)) > 30 THEN '31-60 days'
          ELSE '0-30 days'
        END AS overdue_bucket
      FROM customers c
      JOIN sales s ON c.id = s.customer_id
      WHERE s.status = 'completed'
        AND s.due_amount > 0
        AND DATE(s.created_at) <= ?
      GROUP BY c.id, c.name, c.phone
      ORDER BY days_overdue DESC, total_due DESC
      LIMIT 10
    `;

    // 5. RECENT ACTIVITY (Latest 10)
    const recentActivitySql = `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        s.invoice_no,
        s.total_amount,
        s.paid_amount,
        s.due_amount,
        s.payment_method,
        s.created_at AS transaction_date,
        u.name AS served_by
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      ORDER BY s.created_at DESC
      LIMIT 10
    `;

    // EXECUTE QUERIES
    const [overviewResult] = await pool.query(overviewSql, [
      startDate,
      endDate,
      startDate,
      endDate,
    ]);
    const [topCustomersResult] = await pool.query(topCustomersSql, [
      startDate,
      endDate,
    ]);
    const [longDueCustomersResult] = await pool.query(longDueCustomersSql, [
      endDate,
      endDate,
      endDate,
      endDate,
      endDate,
      endDate,
    ]);
    const [recentActivityResult] = await pool.query(recentActivitySql, [
      startDate,
      endDate,
    ]);

    const overview = overviewResult[0];

    return {
      success: true,
      period: {
        from_date: startDate,
        to_date: endDate,
        days:
          Math.ceil(
            (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24),
          ) + 1,
      },

      // 1. OVERVIEW
      overview: {
        total_customers: overview.total_customers || 0,
        active_customers: overview.active_customers || 0,
        new_customers: overview.new_customers || 0,
        total_revenue: parseFloat(overview.total_revenue || 0).toFixed(2),
        total_outstanding: parseFloat(overview.total_outstanding || 0).toFixed(
          2,
        ),
        customers_with_dues: overview.customers_with_dues || 0,
        total_transactions: overview.total_transactions || 0,
      },

      // 2. TOP 10 CUSTOMERS
      top_customers: topCustomersResult.map((c) => ({
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        phone: c.phone || "N/A",
        total_purchases: c.total_purchases,
        total_revenue: parseFloat(c.total_revenue || 0).toFixed(2),
        total_paid: parseFloat(c.total_paid || 0).toFixed(2),
        total_due: parseFloat(c.total_due || 0).toFixed(2),
        avg_order_value: parseFloat(c.avg_order_value || 0).toFixed(2),
        last_purchase_date: c.last_purchase_date,
      })),

      // 4. LONG TIME DUE CUSTOMERS
      long_due_customers: longDueCustomersResult.map((c) => ({
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        phone: c.phone || "N/A",
        total_purchases: c.total_purchases,
        total_due: parseFloat(c.total_due || 0).toFixed(2),
        oldest_due_date: c.oldest_due_date,
        latest_due_date: c.latest_due_date,
        days_overdue: c.days_overdue || 0,
        overdue_bucket: c.overdue_bucket,
      })),

      // 5. RECENT ACTIVITY
      recent_activity: recentActivityResult.map((a) => ({
        customer_id: a.customer_id,
        customer_name: a.customer_name,
        phone: a.phone || "N/A",
        invoice_no: a.invoice_no,
        total_amount: parseFloat(a.total_amount || 0).toFixed(2),
        paid_amount: parseFloat(a.paid_amount || 0).toFixed(2),
        due_amount: parseFloat(a.due_amount || 0).toFixed(2),
        payment_method: a.payment_method,
        transaction_date: a.transaction_date,
        served_by: a.served_by || "Unknown",
      })),
    };
  } catch (error) {
    throw new Error(`Customer analysis failed: ${error.message}`);
  }
}
