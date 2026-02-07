import pool from "../config/db.js";


export async function getDailySalesTrendService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  const sql = `
    SELECT
      DATE(s.created_at) AS date,
      COUNT(s.id) AS transaction_count,
      SUM(s.subtotal) AS gross_sales,
      SUM(s.tax) AS tax,
      SUM(s.discount) AS discounts,
      SUM(s.total_amount) AS net_revenue,
      SUM(s.paid_amount) AS cash_received,
      SUM(s.due_amount) AS dues,
      COUNT(DISTINCT s.customer_id) AS unique_customers
    FROM sales s
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY DATE(s.created_at)
    ORDER BY DATE(s.created_at) ASC
  `;

  const [rows] = await pool.query(sql, [startDate, endDate]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    daily_trends: rows.map((row) => ({
      date: row.date,
      transactions: row.transaction_count,
      gross_sales: parseFloat(row.gross_sales || 0).toFixed(2),
      tax: parseFloat(row.tax || 0).toFixed(2),
      discounts: parseFloat(row.discounts || 0).toFixed(2),
      net_revenue: parseFloat(row.net_revenue || 0).toFixed(2),
      cash_received: parseFloat(row.cash_received || 0).toFixed(2),
      dues: parseFloat(row.dues || 0).toFixed(2),
      unique_customers: row.unique_customers,
    })),
  };
}


export async function getSalesPerformanceByStaffService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  const sql = `
    SELECT
      u.id,
      u.name AS staff_name,
      COUNT(s.id) AS total_sales,
      SUM(s.total_amount) AS total_revenue,
      SUM(s.subtotal) AS gross_sales,
      SUM(s.discount) AS total_discounts,
      SUM(s.tax) AS tax_collected,
      SUM(s.paid_amount) AS cash_collected,
      SUM(s.due_amount) AS dues_created,
      COUNT(DISTINCT s.customer_id) AS unique_customers,
      ROUND(SUM(s.total_amount) / NULLIF(COUNT(s.id), 0), 2) AS avg_sale_value,
      COUNT(DISTINCT DATE(s.created_at)) AS working_days
    FROM users u
    LEFT JOIN sales s ON u.id = s.user_id AND DATE(s.created_at) BETWEEN ? AND ?
    WHERE u.role IN ('admin', 'staff')
    GROUP BY u.id, u.name
    ORDER BY total_revenue DESC
  `;

  const [rows] = await pool.query(sql, [startDate, endDate]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    staff_performance: rows.map((row) => ({
      staff_id: row.id,
      staff_name: row.staff_name,
      total_sales: row.total_sales,
      total_revenue: parseFloat(row.total_revenue || 0).toFixed(2),
      gross_sales: parseFloat(row.gross_sales || 0).toFixed(2),
      total_discounts: parseFloat(row.total_discounts || 0).toFixed(2),
      tax_collected: parseFloat(row.tax_collected || 0).toFixed(2),
      cash_collected: parseFloat(row.cash_collected || 0).toFixed(2),
      dues_created: parseFloat(row.dues_created || 0).toFixed(2),
      unique_customers: row.unique_customers,
      avg_sale_value: parseFloat(row.avg_sale_value || 0).toFixed(2),
      working_days: row.working_days,
    })),
  };
}


export async function getPaymentMethodBreakdownService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  const sql = `
    SELECT
      s.payment_method,
      COUNT(s.id) AS transaction_count,
      SUM(s.total_amount) AS total_amount,
      SUM(s.paid_amount) AS cash_collected,
      ROUND((COUNT(s.id) / NULLIF((SELECT COUNT(*) FROM sales WHERE DATE(created_at) BETWEEN ? AND ?), 0)) * 100, 2) AS percentage
    FROM sales s
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY s.payment_method
    ORDER BY total_amount DESC
  `;

  const [rows] = await pool.query(sql, [
    startDate,
    endDate,
    startDate,
    endDate,
  ]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    payment_breakdown: rows.map((row) => ({
      payment_method: row.payment_method || "Unknown",
      transaction_count: row.transaction_count,
      total_amount: parseFloat(row.total_amount || 0).toFixed(2),
      cash_collected: parseFloat(row.cash_collected || 0).toFixed(2),
      percentage: `${row.percentage || 0}%`,
    })),
  };
}
