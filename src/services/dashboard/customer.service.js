import pool from "../../config/db.js";


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
