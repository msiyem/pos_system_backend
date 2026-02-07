import pool from "../config/db.js";

export async function getMainDashboardService(fromDate, toDate) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  try {
    const metricsQuery = `
      SELECT
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.due_amount), 0) AS total_outstanding,
        COUNT(DISTINCT c.id) AS total_customers,
        COUNT(DISTINCT CASE WHEN s.id IS NOT NULL AND c.id IS NOT NULL THEN c.id END) AS active_customers,
        COUNT(DISTINCT s.id) AS total_transactions,
        COALESCE(SUM(CASE WHEN DATE(s.created_at) = DATE(CURDATE()) AND s.payment_method = 'cash' THEN s.paid_amount ELSE 0 END), 0) AS today_cash,
        COALESCE(SUM(CASE WHEN DATE(s.created_at) = DATE(CURDATE()) AND s.payment_method = 'credit' THEN s.due_amount ELSE 0 END), 0) AS today_credit,
        COALESCE(SUM(CASE WHEN DATE(s.created_at) = DATE(CURDATE()) THEN s.total_amount ELSE 0 END), 0) AS today_total_amount,
        COALESCE(SUM(CASE WHEN DATE(s.created_at) = DATE(CURDATE()) THEN COALESCE(sc.total_cost, 0) ELSE 0 END), 0) AS today_total_cost
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN (
        SELECT sale_id, SUM(total_cost) as total_cost
        FROM sale_cogs
        GROUP BY sale_id
      ) sc ON s.id = sc.sale_id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
    `;
    const topCustomersQuery = `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue,
        COALESCE(SUM(s.due_amount), 0) AS outstanding_due
      FROM customers c
      JOIN sales s ON c.id = s.customer_id AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_revenue DESC
      LIMIT 5
    `;

    const topProductsQuery = `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(SUM(si.quantity), 0) AS units_sold,
        COALESCE(SUM(si.subtotal), 0) AS total_revenue,
        p.stock,
        CASE
          WHEN p.stock = 0 THEN 'Out of Stock'
          WHEN p.stock < 20 THEN 'Low Stock'
          ELSE 'In Stock'
        END AS stock_status
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      INNER JOIN products p ON si.product_id = p.id
      GROUP BY p.id, p.name, p.stock
      ORDER BY total_revenue DESC
      LIMIT 5
    `;
    const overduCustomersQuery = `
      SELECT 'overdue_customer' AS alert_type, 'critical' AS severity,
        c.id, c.name AS customer_name, NULL AS product_name,
        DATEDIFF(CURDATE(), MIN(s.created_at)) AS days_overdue, 0 AS reorder_level, 0 AS current_stock,
        COALESCE(SUM(s.due_amount), 0) AS amount_due
      FROM customers c
      JOIN sales s ON c.id = s.customer_id
      WHERE s.status = 'completed' AND s.due_amount > 0
      GROUP BY c.id, c.name
      HAVING DATEDIFF(CURDATE(), MIN(s.created_at)) > 180
      LIMIT 5
    `;
    const outOfStockQuery = `
      SELECT 'out_of_stock' AS alert_type, 'critical' AS severity,
        p.id, NULL AS customer_name, p.name AS product_name,
        0 AS days_overdue, 0 AS reorder_level, p.stock AS current_stock, 0 AS amount_due
      FROM products p
      WHERE p.stock = 0
      LIMIT 5
    `;

    const lowStockQuery = `
      SELECT 'low_stock' AS alert_type, 'high' AS severity,
        p.id, NULL AS customer_name, p.name AS product_name,
        0 AS days_overdue, 20 AS reorder_level, p.stock AS current_stock, 0 AS amount_due
      FROM products p
      WHERE p.stock > 0 AND p.stock < 20
      LIMIT 5
    `;

    const recentTransactionsQuery = `
      SELECT
        s.id AS transaction_id,
        s.invoice_no,
        COALESCE(c.name, 'Walk-in Customer') AS customer_name,
        s.total_amount,
        s.paid_amount,
        s.due_amount,
        CASE
          WHEN s.paid_amount >= s.total_amount THEN 'Paid'
          WHEN s.paid_amount > 0 AND s.due_amount > 0 THEN 'Partial'
          ELSE 'Due'
        END AS status,
        s.created_at AS transaction_date
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      ORDER BY s.created_at DESC
      LIMIT 10
    `;

    const startTime = Date.now();

    const [metricsResult] = await pool.query(metricsQuery, [
      startDate,
      endDate,
    ]);
    const [topCustomersResult] = await pool.query(topCustomersQuery, [
      startDate,
      endDate,
    ]);
    const [topProductsResult] = await pool.query(topProductsQuery, [
      startDate,
      endDate,
    ]);
    const [overdueCustomersResult] = await pool.query(overduCustomersQuery, []);
    const [outOfStockResult] = await pool.query(outOfStockQuery, []);
    const [lowStockResult] = await pool.query(lowStockQuery, []);
    const [recentTransactionsResult] = await pool.query(
      recentTransactionsQuery,
      [startDate, endDate],
    );

    const criticalAlertsResult = [
      ...overdueCustomersResult,
      ...outOfStockResult,
      ...lowStockResult,
    ];

    const metrics = metricsResult[0] || {};
    const executionTime = Date.now() - startTime;

    // Today's profit calculation (Total Amount - Total Cost)
    const todayTotalAmount = parseFloat(metrics.today_total_amount || 0);
    const todayTotalCost = parseFloat(metrics.today_total_cost || 0);
    const todayProfit = Math.max(0, todayTotalAmount - todayTotalCost).toFixed(
      2,
    );

    const criticalAlertsCount = criticalAlertsResult.length;

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

      key_metrics: {
        total_revenue: parseFloat(metrics.total_revenue || 0).toFixed(2),
        total_outstanding: parseFloat(metrics.total_outstanding || 0).toFixed(
          2,
        ),
        total_customers: metrics.total_customers || 0,
        active_customers: metrics.active_customers || 0,
        total_transactions: metrics.total_transactions || 0,
        critical_alerts: criticalAlertsCount,
        today_cash: parseFloat(metrics.today_cash || 0).toFixed(2),
        today_credit: parseFloat(metrics.today_credit || 0).toFixed(2),
        today_profit: todayProfit,
      },

      // TOP 5 CUSTOMERS
      top_customers: topCustomersResult.map((c) => ({
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        phone: c.phone || "N/A",
        total_revenue: parseFloat(c.total_revenue || 0).toFixed(2),
        outstanding_due: parseFloat(c.outstanding_due || 0).toFixed(2),
      })),

      // TOP 5 PRODUCTS
      top_products: topProductsResult.map((p) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        units_sold: p.units_sold || 0,
        total_revenue: parseFloat(p.total_revenue || 0).toFixed(2),
        stock_quantity: p.stock || 0,
        stock_status: p.stock_status,
      })),

      // CRITICAL ALERTS
      critical_alerts: criticalAlertsResult.map((alert) => ({
        alert_type: alert.alert_type,
        severity: alert.severity,
        customer_name: alert.customer_name || null,
        product_name: alert.product_name || null,
        days_overdue: alert.days_overdue || 0,
        current_stock: alert.current_stock || 0,
        reorder_level: alert.reorder_level || 0,
        amount_due: parseFloat(alert.amount_due || 0).toFixed(2),
      })),

      // RECENT TRANSACTIONS
      recent_transactions: recentTransactionsResult.map((t) => ({
        transaction_id: t.invoice_no,
        customer_name: t.customer_name,
        total_amount: parseFloat(t.total_amount || 0).toFixed(2),
        paid_amount: parseFloat(t.paid_amount || 0).toFixed(2),
        due_amount: parseFloat(t.due_amount || 0).toFixed(2),
        status: t.status,
        transaction_date: t.transaction_date,
      })),

      meta: {
        timestamp: new Date().toISOString(),
        execution_time_ms: executionTime,
        data_points:
          criticalAlertsCount +
          topCustomersResult.length +
          topProductsResult.length +
          recentTransactionsResult.length,
      },
    };
  } catch (error) {
    throw new Error(`Main dashboard failed: ${error.message}`);
  }
}
