import pool from "../../config/db.js";


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


export async function getTopProductsByRevenueService(
  fromDate,
  toDate,
  limit = 10,
) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  const sql = `
    SELECT
      p.id,
      p.name AS product_name,
      c.name AS category,
      b.name AS brand,
      COUNT(si.id) AS times_sold,
      SUM(si.quantity) AS total_quantity_sold,
      SUM(si.subtotal) AS total_revenue,
      ROUND(AVG(si.price), 2) AS avg_selling_price,
      p.stock AS current_stock
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY p.id, p.name, c.name, b.name, p.stock
    ORDER BY total_revenue DESC
    LIMIT ?
  `;

  const [rows] = await pool.query(sql, [startDate, endDate, limit]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    top_products: rows.map((row) => ({
      product_id: row.id,
      product_name: row.product_name,
      category: row.category || "Uncategorized",
      brand: row.brand || "No Brand",
      times_sold: row.times_sold,
      total_quantity_sold: row.total_quantity_sold,
      total_revenue: parseFloat(row.total_revenue || 0).toFixed(2),
      avg_selling_price: parseFloat(row.avg_selling_price || 0).toFixed(2),
      current_stock: row.current_stock || 0,
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
