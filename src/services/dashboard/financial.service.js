import pool from "../../config/db.js";


export async function getFinancialSummaryService(fromDate, toDate) {
  let startDate = fromDate?.trim() || null;
  let endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    startDate = past.toISOString().slice(0, 10);
    endDate = now.toISOString().slice(0, 10);
  }

  const params = [startDate, endDate, startDate, endDate, startDate, endDate];

  const sql = `
    SELECT
      -- Revenue Metrics
      COALESCE(SUM(CASE WHEN s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN s.total_amount ELSE 0 END), 0) AS total_revenue,
      COALESCE(SUM(CASE WHEN s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN s.subtotal ELSE 0 END), 0) AS gross_sales,
      COALESCE(SUM(CASE WHEN s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN s.tax ELSE 0 END), 0) AS tax_collected,
      COALESCE(SUM(CASE WHEN s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN s.discount ELSE 0 END), 0) AS total_discounts,
      
      -- Payment Metrics
      COALESCE(SUM(CASE WHEN s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN s.paid_amount ELSE 0 END), 0) AS cash_received,
      COALESCE(SUM(CASE WHEN s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN s.due_amount ELSE 0 END), 0) AS outstanding_dues,
      
      -- Transaction Counts
      COUNT(DISTINCT CASE WHEN s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN s.id ELSE NULL END) AS total_transactions,
      COUNT(DISTINCT CASE WHEN s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN s.customer_id ELSE NULL END) AS unique_customers,
      
      -- Refund Metrics
      COALESCE(SUM(CASE WHEN r.created_at >= ? AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN r.refund_amount ELSE 0 END), 0) AS refund_amount,
      COUNT(DISTINCT CASE WHEN r.created_at >= ? AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY) THEN r.id ELSE NULL END) AS refund_count
      
    FROM sales s
    LEFT JOIN refunds r ON s.id = r.sale_id
    WHERE s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY)
  `;

  const extendedParams = [
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
    startDate,
    endDate,
  ];

  const [[result]] = await pool.query(sql, extendedParams);

  const net_sales = (result.gross_sales || 0) - (result.total_discounts || 0);
  const avg_transaction_value =
    result.total_transactions > 0
      ? (result.total_revenue / result.total_transactions).toFixed(2)
      : 0;
  const refund_rate =
    result.total_transactions > 0
      ? ((result.refund_count / result.total_transactions) * 100).toFixed(2)
      : 0;
  const payment_collection_rate =
    result.total_revenue > 0
      ? ((result.cash_received / result.total_revenue) * 100).toFixed(2)
      : 0;

  return {
    period: { fromDate: startDate, toDate: endDate },
    revenue: {
      total_revenue: parseFloat(result.total_revenue || 0).toFixed(2),
      gross_sales: parseFloat(result.gross_sales || 0).toFixed(2),
      net_sales: parseFloat(net_sales).toFixed(2),
      tax_collected: parseFloat(result.tax_collected || 0).toFixed(2),
      total_discounts: parseFloat(result.total_discounts || 0).toFixed(2),
    },
    payment: {
      cash_received: parseFloat(result.cash_received || 0).toFixed(2),
      outstanding_dues: parseFloat(result.outstanding_dues || 0).toFixed(2),
      collection_rate: `${payment_collection_rate}%`,
    },
    transactions: {
      total_count: result.total_transactions || 0,
      unique_customers: result.unique_customers || 0,
      avg_transaction_value: avg_transaction_value,
    },
    refunds: {
      amount: parseFloat(result.refund_amount || 0).toFixed(2),
      count: result.refund_count || 0,
      rate: `${refund_rate}%`,
    },
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
      SUM(s.paid_amount) AS paid_amount,
      SUM(s.due_amount) AS due_amount,
      ROUND(AVG(s.total_amount), 2) AS avg_transaction_value
    FROM sales s
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY s.payment_method
    ORDER BY total_amount DESC
  `;

  const [rows] = await pool.query(sql, [startDate, endDate]);

  const totalRevenue = rows.reduce(
    (sum, row) => sum + parseFloat(row.total_amount || 0),
    0,
  );

  return {
    period: { fromDate: startDate, toDate: endDate },
    payment_methods: rows.map((row) => ({
      method: row.payment_method,
      transaction_count: row.transaction_count,
      total_amount: parseFloat(row.total_amount || 0).toFixed(2),
      paid_amount: parseFloat(row.paid_amount || 0).toFixed(2),
      due_amount: parseFloat(row.due_amount || 0).toFixed(2),
      avg_transaction_value: parseFloat(row.avg_transaction_value || 0).toFixed(
        2,
      ),
      percentage_of_revenue:
        totalRevenue > 0
          ? ((row.total_amount / totalRevenue) * 100).toFixed(2)
          : "0.00",
    })),
    summary: {
      total_revenue: totalRevenue.toFixed(2),
      methods_used: rows.length,
    },
  };
}


export async function getTaxSummaryService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  const sql = `
    SELECT
      COUNT(s.id) AS total_transactions,
      SUM(s.subtotal) AS gross_sales,
      SUM(s.tax) AS total_tax_collected,
      SUM(s.total_amount) AS total_revenue,
      ROUND(AVG(s.tax), 2) AS avg_tax_per_transaction,
      ROUND((SUM(s.tax) / NULLIF(SUM(s.subtotal), 0)) * 100, 2) AS effective_tax_rate
    FROM sales s
    WHERE DATE(s.created_at) BETWEEN ? AND ?
  `;

  const [[result]] = await pool.query(sql, [startDate, endDate]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    tax_summary: {
      total_transactions: result.total_transactions || 0,
      gross_sales: parseFloat(result.gross_sales || 0).toFixed(2),
      total_tax_collected: parseFloat(result.total_tax_collected || 0).toFixed(
        2,
      ),
      total_revenue: parseFloat(result.total_revenue || 0).toFixed(2),
      avg_tax_per_transaction: parseFloat(
        result.avg_tax_per_transaction || 0,
      ).toFixed(2),
      effective_tax_rate: `${result.effective_tax_rate || 0}%`,
    },
  };
}


export async function getProfitLossStatementService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  const revenueSql = `
    SELECT
      SUM(s.subtotal) AS gross_revenue,
      SUM(s.discount) AS total_discounts,
      SUM(s.total_amount) AS net_revenue,
      SUM(s.tax) AS tax_collected,
      COUNT(s.id) AS total_sales
    FROM sales s
    WHERE DATE(s.created_at) BETWEEN ? AND ?
  `;

  const expensesSql = `
    SELECT
      COALESCE(SUM(amount), 0) AS total_expenses,
      COUNT(*) AS expense_count
    FROM expenses
    WHERE DATE(created_at) BETWEEN ? AND ?
  `;

  const [[revenue]] = await pool.query(revenueSql, [startDate, endDate]);
  const [[expenses]] = await pool.query(expensesSql, [startDate, endDate]);

  const grossRevenue = parseFloat(revenue.gross_revenue || 0);
  const totalExpenses = parseFloat(expenses.total_expenses || 0);
  const netRevenue = parseFloat(revenue.net_revenue || 0);
  const grossProfit = netRevenue - totalExpenses;
  const profitMargin =
    netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(2) : "0.00";

  return {
    period: { fromDate: startDate, toDate: endDate },
    revenue: {
      gross_revenue: grossRevenue.toFixed(2),
      discounts: parseFloat(revenue.total_discounts || 0).toFixed(2),
      net_revenue: netRevenue.toFixed(2),
      tax_collected: parseFloat(revenue.tax_collected || 0).toFixed(2),
      total_sales: revenue.total_sales || 0,
    },
    expenses: {
      total_expenses: totalExpenses.toFixed(2),
      expense_count: expenses.expense_count || 0,
    },
    profit: {
      gross_profit: grossProfit.toFixed(2),
      profit_margin: `${profitMargin}%`,
      status: grossProfit >= 0 ? "Profit" : "Loss",
    },
  };
}
