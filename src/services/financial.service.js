import pool from "../config/db.js";

/**
 * Get comprehensive financial summary for a date range
 * Industry Standard KPIs: Revenue, Net Sales, Gross Profit, Customer Lifetime Value
 */
export async function getFinancialSummaryService(fromDate, toDate) {
  // Default to last 30 days if not provided
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

  // Calculate derived metrics
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

/**
 * Get profit & loss statement
 * Industry standard P&L with revenue, COGS, expenses, and profit
 */
export async function getProfitLossStatementService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  // Get sales revenue data
  const [[salesData]] = await pool.query(
    `
    SELECT
      SUM(s.total_amount) AS total_revenue,
      SUM(s.subtotal) AS gross_sales,
      SUM(s.discount) AS discounts,
      SUM(s.tax) AS tax_collected,
      SUM(s.refund_amount) AS refunds
    FROM sales s
    WHERE DATE(s.created_at) BETWEEN ? AND ?
  `,
    [startDate, endDate],
  );

  // Calculate COGS (Cost of Goods Sold)
  const [[cogsData]] = await pool.query(
    `
    SELECT
      SUM(si.quantity * COALESCE(avg_purchase.avg_price, 0)) AS total_cogs
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    LEFT JOIN (
      SELECT 
        product_id,
        AVG(price) AS avg_price
      FROM purchase_items
      GROUP BY product_id
    ) avg_purchase ON si.product_id = avg_purchase.product_id
    WHERE DATE(s.created_at) BETWEEN ? AND ?
  `,
    [startDate, endDate],
  );

  // Get operating expenses
  const [[expenseData]] = await pool.query(
    `
    SELECT
      SUM(amount) AS total_expenses
    FROM expenses
    WHERE DATE(created_at) BETWEEN ? AND ?
  `,
    [startDate, endDate],
  );

  const revenue = parseFloat(salesData?.total_revenue || 0);
  const refunds = parseFloat(salesData?.refunds || 0);
  const discounts = parseFloat(salesData?.discounts || 0);
  const cogs = parseFloat(cogsData?.total_cogs || 0);
  const expenses = parseFloat(expenseData?.total_expenses || 0);

  // P&L Calculations
  const net_revenue = revenue - refunds;
  const gross_profit = net_revenue - cogs;
  const net_profit = gross_profit - expenses;

  const gross_margin =
    net_revenue > 0 ? ((gross_profit / net_revenue) * 100).toFixed(2) : 0;
  const net_margin =
    net_revenue > 0 ? ((net_profit / net_revenue) * 100).toFixed(2) : 0;

  return {
    period: { fromDate: startDate, toDate: endDate },
    revenue: {
      gross_revenue: revenue.toFixed(2),
      refunds: refunds.toFixed(2),
      discounts: discounts.toFixed(2),
      net_revenue: net_revenue.toFixed(2),
    },
    cost_of_goods_sold: {
      total_cogs: cogs.toFixed(2),
      cogs_percentage:
        net_revenue > 0 ? ((cogs / net_revenue) * 100).toFixed(2) + "%" : "0%",
    },
    gross_profit: {
      amount: gross_profit.toFixed(2),
      margin: `${gross_margin}%`,
    },
    operating_expenses: {
      total_expenses: expenses.toFixed(2),
      expense_ratio:
        net_revenue > 0
          ? ((expenses / net_revenue) * 100).toFixed(2) + "%"
          : "0%",
    },
    net_profit: {
      amount: net_profit.toFixed(2),
      margin: `${net_margin}%`,
    },
  };
}

/**
 * Get tax summary by category
 */
export async function getTaxSummaryService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  const sql = `
    SELECT
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COUNT(DISTINCT s.id) AS transaction_count,
      SUM(s.subtotal) AS subtotal,
      SUM(s.tax) AS tax_amount,
      ROUND((SUM(s.tax) / NULLIF(SUM(s.subtotal), 0)) * 100, 2) AS tax_rate
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY c.id, c.name
    ORDER BY tax_amount DESC
  `;

  const [rows] = await pool.query(sql, [startDate, endDate]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    tax_summary: rows.map((row) => ({
      category_name: row.category_name,
      transaction_count: row.transaction_count,
      subtotal: parseFloat(row.subtotal || 0).toFixed(2),
      tax_amount: parseFloat(row.tax_amount || 0).toFixed(2),
      tax_rate: `${row.tax_rate || 0}%`,
    })),
  };
}

// Helper function for FIFO COGS calculation
async function calculateFifoCogs(fromDate, toDate) {
  const directCogsSql = `
    SELECT 
      COALESCE(SUM(total_cost), 0) as total_cogs,
      COALESCE(SUM(quantity), 0) as total_units_sold
    FROM sale_cogs sc
    JOIN sales s ON sc.sale_id = s.id
    WHERE s.status = 'completed' 
      AND DATE(s.created_at) BETWEEN ? AND ?
  `;

  const [directCogsResult] = await pool.query(directCogsSql, [
    fromDate,
    toDate,
  ]);

  if (
    directCogsResult &&
    directCogsResult[0] &&
    Number(directCogsResult[0].total_cogs) > 0
  ) {
    return {
      total_cogs: Number(directCogsResult[0].total_cogs),
      total_units_sold: Number(directCogsResult[0].total_units_sold),
    };
  }

  // Fallback: Recalculate FIFO from scratch
  const purchasesSql = `
    SELECT
      pi.product_id,
      pi.quantity,
      pi.price,
      pu.created_at
    FROM purchase_items pi
    INNER JOIN purchases pu ON pi.purchase_id = pu.id
    WHERE pi.price > 0 AND DATE(pu.created_at) <= ?
    ORDER BY pu.created_at ASC, pi.id ASC
  `;

  const salesSql = `
    SELECT
      si.product_id,
      si.quantity,
      si.subtotal,
      s.created_at
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'completed' AND DATE(s.created_at) <= ?
    ORDER BY s.created_at ASC, si.id ASC
  `;

  const [purchaseRows] = await pool.query(purchasesSql, [toDate]);
  const [saleRows] = await pool.query(salesSql, [toDate]);

  const start = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDate}T23:59:59.999Z`);

  const avgPriceTotals = new Map();
  const queues = new Map();
  const events = [];

  purchaseRows.forEach((row) => {
    const quantity = Number(row.quantity) || 0;
    const price = Number(row.price) || 0;
    if (quantity <= 0 || price <= 0) return;

    const totals = avgPriceTotals.get(row.product_id) || {
      totalQty: 0,
      totalCost: 0,
    };
    totals.totalQty += quantity;
    totals.totalCost += quantity * price;
    avgPriceTotals.set(row.product_id, totals);

    events.push({
      type: "purchase",
      productId: row.product_id,
      quantity,
      price,
      createdAt: new Date(row.created_at),
    });
  });

  saleRows.forEach((row) => {
    const quantity = Number(row.quantity) || 0;
    if (quantity <= 0) return;

    const createdAt = new Date(row.created_at);
    const inRange = createdAt >= start && createdAt <= end;

    events.push({
      type: "sale",
      productId: row.product_id,
      quantity,
      createdAt,
      inRange,
    });
  });

  events.sort((a, b) => {
    const timeDiff = a.createdAt - b.createdAt;
    if (timeDiff !== 0) return timeDiff;
    if (a.type === b.type) return 0;
    return a.type === "purchase" ? -1 : 1;
  });

  let totalCogs = 0;
  let totalUnitsSoldInRange = 0;

  const getQueue = (productId) => {
    if (!queues.has(productId)) queues.set(productId, []);
    return queues.get(productId);
  };

  const getFallbackPrice = (productId) => {
    const totals = avgPriceTotals.get(productId);
    if (!totals || totals.totalQty <= 0) return 0;
    return totals.totalCost / totals.totalQty;
  };

  events.forEach((event) => {
    if (event.type === "purchase") {
      const queue = getQueue(event.productId);
      queue.push({ qty: event.quantity, price: event.price });
      return;
    }

    const queue = getQueue(event.productId);
    let remaining = event.quantity;

    while (remaining > 0 && queue.length > 0) {
      const lot = queue[0];
      const usedQty = Math.min(remaining, lot.qty);
      if (event.inRange) {
        totalCogs += usedQty * lot.price;
      }
      lot.qty -= usedQty;
      remaining -= usedQty;
      if (lot.qty <= 0) queue.shift();
    }

    if (remaining > 0) {
      const fallbackPrice = getFallbackPrice(event.productId);
      if (event.inRange) {
        totalCogs += remaining * fallbackPrice;
      }
      remaining = 0;
    }

    if (event.inRange) {
      totalUnitsSoldInRange += event.quantity;
    }
  });

  return {
    total_cogs: totalCogs,
    total_units_sold: totalUnitsSoldInRange,
  };
}

/**
 * COMPREHENSIVE FINANCIAL ANALYSIS - Industry Standard
 */
export async function getComprehensiveFinancialAnalysisService(
  fromDate,
  toDate,
  days = 30,
) {
  const startDate = fromDate;
  const endDate = toDate;

  // Execute all queries in parallel
  const [
    [revenueData],
    [cogsData],
    [expensesData],
    [receivablesData],
    [paymentMethodData],
    [taxData],
    [inventoryData],
    [dailyAvgData],
    fifoCogsData,
  ] = await Promise.all([
    pool.query(
      `
      SELECT
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(COUNT(DISTINCT s.id), 0) AS total_transactions,
        COALESCE(SUM(s.total_amount) / NULLIF(COUNT(DISTINCT s.id), 0), 0) AS avg_transaction_value,
        COALESCE(MIN(s.total_amount), 0) AS min_transaction_value,
        COALESCE(MAX(s.total_amount), 0) AS max_transaction_value,
        COALESCE(STDDEV(s.total_amount), 0) AS transaction_value_stddev,
        COALESCE(COUNT(DISTINCT s.customer_id), 0) AS unique_customers,
        COALESCE(SUM(s.total_amount) / NULLIF(COUNT(DISTINCT s.customer_id), 0), 0) AS avg_revenue_per_customer,
        ROUND(
          (COALESCE(SUM(CASE WHEN s.due_amount = 0 THEN s.total_amount ELSE 0 END), 0) / 
           NULLIF(SUM(s.total_amount), 0)) * 100, 2
        ) AS cash_collection_rate,
        COALESCE(SUM(s.due_amount), 0) AS total_due_amount
      FROM sales s
      WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
    `,
      [startDate, endDate],
    ),
    pool.query(
      `
      SELECT
        COALESCE(SUM(si.subtotal), 0) AS gross_sales,
        COALESCE(COUNT(DISTINCT si.product_id), 0) AS num_products_sold,
        COALESCE(SUM(si.quantity), 0) AS total_units_sold,
        ROUND(
          COALESCE(SUM(si.subtotal), 0) / NULLIF(SUM(si.quantity), 0), 2
        ) AS avg_selling_price_per_unit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
    `,
      [startDate, endDate],
    ),
    pool.query(
      `
      SELECT
        COALESCE(SUM(amount), 0) AS total_expenses,
        COUNT(DISTINCT category) AS expense_categories,
        GROUP_CONCAT(DISTINCT category) AS categories_list,
        MAX(amount) AS max_single_expense,
        COALESCE(SUM(CASE WHEN category = 'Salary' THEN amount ELSE 0 END), 0) AS salary_expenses,
        COALESCE(SUM(CASE WHEN category = 'Utilities' THEN amount ELSE 0 END), 0) AS utility_expenses,
        COALESCE(SUM(CASE WHEN category = 'Rent' THEN amount ELSE 0 END), 0) AS rent_expenses,
        COALESCE(SUM(CASE WHEN category NOT IN ('Salary', 'Utilities', 'Rent') THEN amount ELSE 0 END), 0) AS other_expenses
      FROM expenses
      WHERE DATE(created_at) BETWEEN ? AND ?
    `,
      [startDate, endDate],
    ),
    pool.query(
      `
      SELECT
        COALESCE(SUM(s.paid_amount), 0) AS cash_collected,
        COALESCE(SUM(s.due_amount), 0) AS outstanding_receivables,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN s.paid_amount > 0 AND s.due_amount > 0 THEN s.total_amount ELSE 0 END), 0) AS partial_payments,
        COUNT(DISTINCT CASE WHEN s.due_amount > 0 THEN s.customer_id END) AS customers_with_outstanding,
        COALESCE(SUM(s.due_amount), 0) / 
        NULLIF(COALESCE(COUNT(DISTINCT CASE WHEN s.due_amount > 0 THEN s.id END), 1), 0) AS avg_outstanding_per_transaction,
        DATEDIFF(NOW(), MAX(CASE WHEN s.due_amount > 0 THEN s.created_at END)) AS days_since_oldest_due,
        COUNT(DISTINCT CASE WHEN DATEDIFF(NOW(), s.created_at) > 30 AND s.due_amount > 0 THEN s.id END) AS overdue_count_30days
      FROM sales s
      WHERE DATE(s.created_at) BETWEEN ? AND ?
    `,
      [startDate, endDate],
    ),
    pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN s.payment_method = 'cash' THEN s.total_amount ELSE 0 END), 0) AS cash_payments,
        COALESCE(SUM(CASE WHEN s.payment_method = 'card' THEN s.total_amount ELSE 0 END), 0) AS card_payments,
        COALESCE(SUM(CASE WHEN s.payment_method = 'bkash' THEN s.total_amount ELSE 0 END), 0) AS mobile_banking_payments,
        COALESCE(SUM(CASE WHEN s.payment_method = 'nagad' THEN s.total_amount ELSE 0 END), 0) AS nagad_payments,
        COALESCE(SUM(CASE WHEN s.payment_method = 'due' THEN s.total_amount ELSE 0 END), 0) AS due_payments,
        COUNT(DISTINCT CASE WHEN s.payment_method = 'cash' THEN s.id END) AS cash_transactions,
        COUNT(DISTINCT CASE WHEN s.payment_method = 'card' THEN s.id END) AS card_transactions,
        COUNT(DISTINCT CASE WHEN s.payment_method = 'bkash' THEN s.id END) AS mobile_banking_transactions,
        COUNT(DISTINCT CASE WHEN s.payment_method = 'nagad' THEN s.id END) AS nagad_transactions,
        COUNT(DISTINCT CASE WHEN s.payment_method = 'due' THEN s.id END) AS due_transactions
      FROM sales s
      WHERE DATE(s.created_at) BETWEEN ? AND ?
    `,
      [startDate, endDate],
    ),
    pool.query(
      `
      SELECT
        COALESCE(SUM(s.tax), 0) AS total_tax_collected, 
        COALESCE(SUM(s.subtotal), 0) AS taxable_sales,
        ROUND(
          COALESCE(SUM(s.tax), 0) / NULLIF(COALESCE(SUM(s.subtotal), 0), 0) * 100, 2
        ) AS effective_tax_rate,
        COUNT(DISTINCT s.id) AS taxable_transactions
      FROM sales s
      WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
    `,
      [startDate, endDate],
    ),
    pool.query(`
      SELECT
        (SELECT COALESCE(SUM(stock), 0) FROM products WHERE status = 'active') AS total_inventory_units,
        (SELECT COUNT(DISTINCT id) FROM products WHERE status = 'active') AS total_sku_count,
        (SELECT COALESCE(SUM(stock * price), 0) FROM products WHERE status = 'active') AS inventory_value_at_retail,
        (SELECT COALESCE(SUM(p.stock * COALESCE(pi.avg_price, p.price * 0.5)), 0)
          FROM products p
          LEFT JOIN (
            SELECT product_id, AVG(price) AS avg_price
            FROM purchase_items
            GROUP BY product_id
          ) pi ON p.id = pi.product_id
          WHERE p.status = 'active'
        ) AS inventory_value_at_cost
    `),
    pool.query(
      `
      SELECT
        ROUND(COALESCE(SUM(s.total_amount), 0) / NULLIF(COUNT(DISTINCT DATE(s.created_at)), 0), 2) AS avg_daily_revenue,
        ROUND(COALESCE(SUM(si.quantity), 0) / NULLIF(COUNT(DISTINCT DATE(s.created_at)), 0), 2) AS avg_daily_units_sold,
        COUNT(DISTINCT DATE(s.created_at)) AS business_days,
        COALESCE(SUM(s.total_amount), 0) / NULLIF(COUNT(DISTINCT s.user_id), 0) AS avg_revenue_per_staff
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
    `,
      [startDate, endDate],
    ),
    calculateFifoCogs(startDate, endDate),
  ]);

  const revenue = revenueData[0] || {};
  const cogs = cogsData[0] || {};
  const expenses = expensesData[0] || {};
  const receivables = receivablesData[0] || {};
  const paymentMethods = paymentMethodData[0] || {};
  const tax = taxData[0] || {};
  const inventory = inventoryData[0] || {};
  const dailyAvg = dailyAvgData[0] || {};
  const fifoCogs = fifoCogsData || { total_cogs: 0, total_units_sold: 0 };

  const grossSales = Number(cogs.gross_sales) || 0;
  const totalUnitsSold = Number(cogs.total_units_sold) || 0;
  const fifoTotalCogs = Number(fifoCogs.total_cogs) || 0;
  const grossProfit = grossSales - fifoTotalCogs;
  const grossMarginPercent =
    grossSales > 0 ? ((grossProfit / grossSales) * 100).toFixed(2) : "0.00";
  const totalOperatingExpenses = Number(expenses.total_expenses) || 0;
  const netProfit = grossProfit - totalOperatingExpenses;
  const netProfitMarginPercent =
    grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(2) : "0.00";
  const avgCogsPerUnit =
    totalUnitsSold > 0 ? (fifoTotalCogs / totalUnitsSold).toFixed(2) : "0.00";

  return {
    period: { from_date: startDate, to_date: endDate, days },

    revenue_analysis: {
      total_revenue: parseFloat(revenue.total_revenue || 0).toFixed(2),
      total_transactions: revenue.total_transactions || 0,
      avg_transaction_value: parseFloat(
        revenue.avg_transaction_value || 0,
      ).toFixed(2),
      min_transaction_value: parseFloat(
        revenue.min_transaction_value || 0,
      ).toFixed(2),
      max_transaction_value: parseFloat(
        revenue.max_transaction_value || 0,
      ).toFixed(2),
      transaction_value_stddev: parseFloat(
        revenue.transaction_value_stddev || 0,
      ).toFixed(2),
      unique_customers: revenue.unique_customers || 0,
      avg_revenue_per_customer: parseFloat(
        revenue.avg_revenue_per_customer || 0,
      ).toFixed(2),
      cash_collection_rate: (revenue.cash_collection_rate || 0) + "%",
      total_due_amount: parseFloat(revenue.total_due_amount || 0).toFixed(2),
    },

    gross_profit_analysis: {
      gross_sales: parseFloat(cogs.gross_sales || 0).toFixed(2),
      total_cogs: parseFloat(fifoTotalCogs || 0).toFixed(2),
      gross_profit: parseFloat(grossProfit || 0).toFixed(2),
      gross_profit_margin: grossMarginPercent + "%",
      num_products_sold: cogs.num_products_sold || 0,
      total_units_sold: cogs.total_units_sold || 0,
      avg_selling_price_per_unit: parseFloat(
        cogs.avg_selling_price_per_unit || 0,
      ).toFixed(2),
      avg_cogs_per_unit: avgCogsPerUnit,
    },

    operating_expenses: {
      total_expenses: parseFloat(expenses.total_expenses || 0).toFixed(2),
      expense_categories: expenses.expense_categories || 0,
      categories_list: (expenses.categories_list || "").split(","),
      max_single_expense: parseFloat(expenses.max_single_expense || 0).toFixed(
        2,
      ),
      salary_expenses: parseFloat(expenses.salary_expenses || 0).toFixed(2),
      utility_expenses: parseFloat(expenses.utility_expenses || 0).toFixed(2),
      rent_expenses: parseFloat(expenses.rent_expenses || 0).toFixed(2),
      other_expenses: parseFloat(expenses.other_expenses || 0).toFixed(2),
      expense_breakdown: {
        salary_percent:
          expenses.total_expenses > 0
            ? (
                (expenses.salary_expenses / expenses.total_expenses) *
                100
              ).toFixed(2)
            : "0.00",
        utilities_percent:
          expenses.total_expenses > 0
            ? (
                (expenses.utility_expenses / expenses.total_expenses) *
                100
              ).toFixed(2)
            : "0.00",
        rent_percent:
          expenses.total_expenses > 0
            ? (
                (expenses.rent_expenses / expenses.total_expenses) *
                100
              ).toFixed(2)
            : "0.00",
        other_percent:
          expenses.total_expenses > 0
            ? (
                (expenses.other_expenses / expenses.total_expenses) *
                100
              ).toFixed(2)
            : "0.00",
      },
    },

    profitability_metrics: {
      gross_profit: parseFloat(grossProfit || 0).toFixed(2),
      gross_margin_percent: grossMarginPercent + "%",
      total_operating_expenses: parseFloat(totalOperatingExpenses || 0).toFixed(
        2,
      ),
      net_profit: parseFloat(netProfit || 0).toFixed(2),
      net_profit_margin_percent: netProfitMarginPercent + "%",
      operating_expense_ratio:
        grossSales > 0
          ? ((totalOperatingExpenses / grossSales) * 100).toFixed(2)
          : "0.00",
    },

    receivables_analysis: {
      cash_collected: parseFloat(receivables.cash_collected || 0).toFixed(2),
      outstanding_receivables: parseFloat(
        receivables.outstanding_receivables || 0,
      ).toFixed(2),
      partial_payments: parseFloat(receivables.partial_payments || 0).toFixed(
        2,
      ),
      customers_with_outstanding: receivables.customers_with_outstanding || 0,
      avg_outstanding_per_transaction: parseFloat(
        receivables.avg_outstanding_per_transaction || 0,
      ).toFixed(2),
      days_since_oldest_due: receivables.days_since_oldest_due || 0,
      overdue_count_30days: receivables.overdue_count_30days || 0,
      collection_efficiency:
        receivables.total_revenue > 0
          ? (
              (receivables.cash_collected / receivables.total_revenue) *
              100
            ).toFixed(2)
          : "100.00",
    },

    payment_methods: {
      cash: {
        amount: parseFloat(paymentMethods.cash_payments || 0).toFixed(2),
        transactions: paymentMethods.cash_transactions || 0,
        avg_transaction:
          paymentMethods.cash_transactions > 0
            ? (
                paymentMethods.cash_payments / paymentMethods.cash_transactions
              ).toFixed(2)
            : "0.00",
      },
      card: {
        amount: parseFloat(paymentMethods.card_payments || 0).toFixed(2),
        transactions: paymentMethods.card_transactions || 0,
        avg_transaction:
          paymentMethods.card_transactions > 0
            ? (
                paymentMethods.card_payments / paymentMethods.card_transactions
              ).toFixed(2)
            : "0.00",
      },
      bkash: {
        amount: parseFloat(paymentMethods.mobile_banking_payments || 0).toFixed(
          2,
        ),
        transactions: paymentMethods.mobile_banking_transactions || 0,
        avg_transaction:
          paymentMethods.mobile_banking_transactions > 0
            ? (
                paymentMethods.mobile_banking_payments /
                paymentMethods.mobile_banking_transactions
              ).toFixed(2)
            : "0.00",
      },
      nagad: {
        amount: parseFloat(paymentMethods.nagad_payments || 0).toFixed(2),
        transactions: paymentMethods.nagad_transactions || 0,
        avg_transaction:
          paymentMethods.nagad_transactions > 0
            ? (
                paymentMethods.nagad_payments /
                paymentMethods.nagad_transactions
              ).toFixed(2)
            : "0.00",
      },
      due: {
        amount: parseFloat(paymentMethods.due_payments || 0).toFixed(2),
        transactions: paymentMethods.due_transactions || 0,
        avg_transaction:
          paymentMethods.due_transactions > 0
            ? (
                paymentMethods.due_payments / paymentMethods.due_transactions
              ).toFixed(2)
            : "0.00",
      },
    },

    tax_analysis: {
      total_tax_collected: parseFloat(tax.total_tax_collected || 0).toFixed(2),
      taxable_sales: parseFloat(tax.taxable_sales || 0).toFixed(2),
      effective_tax_rate: (tax.effective_tax_rate || 0) + "%",
      taxable_transactions: tax.taxable_transactions || 0,
    },

    inventory_valuation: {
      total_inventory_units: inventory.total_inventory_units || 0,
      total_sku_count: inventory.total_sku_count || 0,
      inventory_value_at_retail: parseFloat(
        inventory.inventory_value_at_retail || 0,
      ).toFixed(2),
      inventory_value_at_cost: parseFloat(
        inventory.inventory_value_at_cost || 0,
      ).toFixed(2),
      inventory_markup_percent:
        inventory.inventory_value_at_retail && inventory.inventory_value_at_cost
          ? (
              ((inventory.inventory_value_at_retail -
                inventory.inventory_value_at_cost) /
                inventory.inventory_value_at_cost) *
              100
            ).toFixed(2)
          : "0.00",
    },

    daily_averages: {
      avg_daily_revenue: parseFloat(dailyAvg.avg_daily_revenue || 0).toFixed(2),
      avg_daily_units_sold: parseFloat(
        dailyAvg.avg_daily_units_sold || 0,
      ).toFixed(2),
      business_days: dailyAvg.business_days || 0,
      avg_revenue_per_staff: parseFloat(
        dailyAvg.avg_revenue_per_staff || 0,
      ).toFixed(2),
    },
  };
}
