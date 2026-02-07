import pool from "../config/db.js";

// Re-export transaction services
export {
  getAllTransactionHistoryService,
  getAllTransactionCountService,
  getUserTransactionHistoryService,
  getUserTransactionCountService,
  getUserTransactionSummaryService,
} from "./dashboard/transaction.service.js";

// Re-export financial services
export {
  getFinancialSummaryService,
  getPaymentMethodBreakdownService,
  getTaxSummaryService,
  getProfitLossStatementService,
} from "./dashboard/financial.service.js";

// Re-export sales services
export {
  getDailySalesTrendService,
  getTopProductsByRevenueService,
  getSalesPerformanceByStaffService,
} from "./dashboard/sales.service.js";

// Re-export customer services
export { getCustomerPaymentAnalysisService } from "./dashboard/customer.service.js";

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

    // 3. SEGMENTATION
    const segmentationSql = `
      SELECT
        'VIP' AS segment,
        COUNT(DISTINCT c.id) AS customer_count,
        COALESCE(SUM(s.total_amount), 0) AS segment_revenue
      FROM customers c JOIN sales s ON c.id = s.customer_id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY c.id
      HAVING SUM(s.total_amount) >= 10000
      UNION ALL
      SELECT 'Regular', COUNT(DISTINCT c.id), COALESCE(SUM(s.total_amount), 0)
      FROM customers c JOIN sales s ON c.id = s.customer_id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY c.id
      HAVING SUM(s.total_amount) >= 1000 AND SUM(s.total_amount) < 10000
      UNION ALL
      SELECT 'Occasional', COUNT(DISTINCT c.id), COALESCE(SUM(s.total_amount), 0)
      FROM customers c JOIN sales s ON c.id = s.customer_id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY c.id
      HAVING SUM(s.total_amount) < 1000 AND COUNT(s.id) >= 2
      UNION ALL
      SELECT 'One-Time', COUNT(DISTINCT c.id), COALESCE(SUM(s.total_amount), 0)
      FROM customers c JOIN sales s ON c.id = s.customer_id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY c.id
      HAVING COUNT(s.id) = 1
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
    const [segmentationResult] = await pool.query(segmentationSql, [
      startDate,
      endDate,
      startDate,
      endDate,
      startDate,
      endDate,
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

      // 3. SEGMENTATION
      segmentation: segmentationResult.map((s) => ({
        segment: s.segment,
        customer_count: s.customer_count || 0,
        segment_revenue: parseFloat(s.segment_revenue || 0).toFixed(2),
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

/**
 * Get inventory alerts - low stock, out of stock, overstock
 * Critical for inventory management and reordering
 */
export async function getInventoryAlertsService() {
  const sql = `
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.sku,
      p.stock AS current_stock,
      p.price,
      c.name AS category_name,
      b.name AS brand_name,
      CASE
        WHEN p.stock = 0 THEN 'out_of_stock'
        WHEN p.stock <= 10 THEN 'low_stock'
        WHEN p.stock > 100 THEN 'overstock'
        ELSE 'normal'
      END AS alert_type,
      CASE
        WHEN p.stock = 0 THEN 'critical'
        WHEN p.stock <= 5 THEN 'high'
        WHEN p.stock <= 10 THEN 'medium'
        WHEN p.stock > 100 THEN 'low'
      END AS priority
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.status = 'active'
      AND (p.stock = 0 OR p.stock <= 10 OR p.stock > 100)
    ORDER BY
      CASE
        WHEN p.stock = 0 THEN 1
        WHEN p.stock <= 5 THEN 2
        WHEN p.stock <= 10 THEN 3
        WHEN p.stock > 100 THEN 4
      END,
      p.stock ASC
  `;

  const [rows] = await pool.query(sql);

  // Group by alert type
  const alerts = {
    out_of_stock: [],
    low_stock: [],
    overstock: [],
  };

  rows.forEach((row) => {
    const alert = {
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      current_stock: row.current_stock,
      price: parseFloat(row.price).toFixed(2),
      category_name: row.category_name || "Uncategorized",
      brand_name: row.brand_name || "No Brand",
      priority: row.priority,
    };

    alerts[row.alert_type].push(alert);
  });

  return {
    summary: {
      total_alerts: rows.length,
      out_of_stock_count: alerts.out_of_stock.length,
      low_stock_count: alerts.low_stock.length,
      overstock_count: alerts.overstock.length,
    },
    alerts,
  };
}

/**
 * Get stock movement analysis - fast/slow moving products
 * Helps identify which products are selling well or sitting idle
 */
export async function getStockMovementService(days = 30) {
  const sql = `
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.sku,
      p.stock AS current_stock,
      p.price,
      c.name AS category_name,
      COALESCE(SUM(si.quantity), 0) AS units_sold,
      COALESCE(SUM(si.subtotal), 0) AS total_revenue,
      ROUND(COALESCE(SUM(si.quantity), 0) / ?, 2) AS avg_daily_sales,
      CASE
        WHEN COALESCE(SUM(si.quantity), 0) = 0 THEN 'no_movement'
        WHEN COALESCE(SUM(si.quantity), 0) / ? >= 5 THEN 'fast_moving'
        WHEN COALESCE(SUM(si.quantity), 0) / ? >= 1 THEN 'moderate_moving'
        ELSE 'slow_moving'
      END AS movement_type,
      CASE
        WHEN COALESCE(SUM(si.quantity), 0) / ? > 0 
        THEN ROUND(p.stock / (COALESCE(SUM(si.quantity), 0) / ?), 0)
        ELSE NULL
      END AS days_of_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id AND s.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    WHERE p.status = 'active'
    GROUP BY p.id, p.name, p.sku, p.stock, p.price, c.name
    ORDER BY units_sold DESC
  `;

  const [rows] = await pool.query(sql, [days, days, days, days, days, days]);

  // Group by movement type
  const movement = {
    fast_moving: [],
    moderate_moving: [],
    slow_moving: [],
    no_movement: [],
  };

  rows.forEach((row) => {
    const product = {
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      current_stock: row.current_stock,
      price: parseFloat(row.price).toFixed(2),
      category_name: row.category_name || "Uncategorized",
      units_sold: row.units_sold,
      total_revenue: parseFloat(row.total_revenue).toFixed(2),
      avg_daily_sales: row.avg_daily_sales,
      days_of_stock: row.days_of_stock,
    };

    movement[row.movement_type].push(product);
  });

  return {
    period_days: days,
    summary: {
      fast_moving_count: movement.fast_moving.length,
      moderate_moving_count: movement.moderate_moving.length,
      slow_moving_count: movement.slow_moving.length,
      no_movement_count: movement.no_movement.length,
    },
    movement,
  };
}

/**
 * Get reorder recommendations based on sales velocity
 * Smart reordering based on average daily sales and current stock
 */
export async function getReorderRecommendationsService(days = 30) {
  // First get FIFO costs per product from actual COGS
  const fifoCostSql = `
    SELECT 
      product_id,
      COALESCE(SUM(total_cost) / NULLIF(SUM(quantity), 0), 0) as fifo_cost_per_unit
    FROM sale_cogs
    GROUP BY product_id
  `;

  const [fifoCosts] = await pool.query(fifoCostSql);
  const fifoCostMap = new Map();
  fifoCosts.forEach((row) => {
    fifoCostMap.set(row.product_id, Number(row.fifo_cost_per_unit));
  });

  const sql = `
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.sku,
      p.stock AS current_stock,
      p.price AS selling_price,
      c.name AS category_name,
      b.name AS brand_name,
      COALESCE(SUM(si.quantity), 0) AS units_sold_period,
      ROUND(COALESCE(SUM(si.quantity), 0) / ?, 2) AS avg_daily_sales,
      COALESCE(avg_purchase.avg_purchase_price, 0) AS avg_purchase_price,
      CASE
        WHEN COALESCE(SUM(si.quantity), 0) / ? > 0 
        THEN ROUND(p.stock / (COALESCE(SUM(si.quantity), 0) / ?), 0)
        ELSE NULL
      END AS days_until_stockout,
      CASE
        WHEN COALESCE(SUM(si.quantity), 0) / ? > 0
        THEN GREATEST(0, ROUND((COALESCE(SUM(si.quantity), 0) / ?) * 30 - p.stock, 0))
        ELSE 0
      END AS recommended_reorder_qty
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id AND s.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    LEFT JOIN (
      SELECT product_id, AVG(price) AS avg_purchase_price
      FROM purchase_items
      GROUP BY product_id
    ) avg_purchase ON p.id = avg_purchase.product_id
    WHERE p.status = 'active'
    GROUP BY p.id, p.name, p.sku, p.stock, p.price, c.name, b.name, avg_purchase.avg_purchase_price
    HAVING 
      avg_daily_sales > 0 
      AND (days_until_stockout IS NULL OR days_until_stockout <= 30)
      AND recommended_reorder_qty > 0
    ORDER BY days_until_stockout ASC, avg_daily_sales DESC
  `;

  const [rows] = await pool.query(sql, [days, days, days, days, days, days]);

  const recommendations = rows.map((row) => {
    const reorder_qty = row.recommended_reorder_qty;
    const avg_purchase_price = parseFloat(row.avg_purchase_price);

    // Use FIFO cost per unit if available, fallback to average cost
    const fifo_cost = fifoCostMap.get(row.product_id) || avg_purchase_price;

    const selling_price = parseFloat(row.selling_price);
    const estimated_cost = reorder_qty * fifo_cost;
    const potential_revenue = reorder_qty * selling_price;
    const potential_profit = potential_revenue - estimated_cost;

    return {
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      current_stock: row.current_stock,
      category_name: row.category_name || "Uncategorized",
      brand_name: row.brand_name || "No Brand",
      sales_metrics: {
        units_sold_last_30_days: row.units_sold_period,
        avg_daily_sales: row.avg_daily_sales,
        days_until_stockout: row.days_until_stockout,
      },
      reorder_recommendation: {
        recommended_qty: reorder_qty,
        avg_purchase_price: avg_purchase_price.toFixed(2),
        fifo_cost_per_unit: fifo_cost.toFixed(2),
        estimated_cost: estimated_cost.toFixed(2),
        selling_price: selling_price.toFixed(2),
        potential_revenue: potential_revenue.toFixed(2),
        potential_profit: potential_profit.toFixed(2),
        profit_margin:
          potential_revenue > 0
            ? ((potential_profit / potential_revenue) * 100).toFixed(2) + "%"
            : "0%",
      },
      priority:
        row.days_until_stockout <= 7
          ? "urgent"
          : row.days_until_stockout <= 14
            ? "high"
            : "medium",
    };
  });

  const total_estimated_cost = recommendations.reduce(
    (sum, r) => sum + parseFloat(r.reorder_recommendation.estimated_cost),
    0,
  );
  const total_potential_profit = recommendations.reduce(
    (sum, r) => sum + parseFloat(r.reorder_recommendation.potential_profit),
    0,
  );

  return {
    period_days: days,
    valuation_method: "FIFO (First-In First-Out) using sale_cogs data",
    summary: {
      total_products_to_reorder: recommendations.length,
      urgent_priority: recommendations.filter((r) => r.priority === "urgent")
        .length,
      high_priority: recommendations.filter((r) => r.priority === "high")
        .length,
      medium_priority: recommendations.filter((r) => r.priority === "medium")
        .length,
      total_estimated_investment: total_estimated_cost.toFixed(2),
      total_potential_profit: total_potential_profit.toFixed(2),
    },
    recommendations,
  };
}

export async function getInventoryValuationService() {
  // Get FIFO costs per product from actual sale_cogs records (most accurate)
  const fifoCostSql = `
    SELECT 
      product_id,
      COALESCE(SUM(total_cost) / NULLIF(SUM(quantity), 0), 0) as fifo_cost_per_unit,
      COALESCE(SUM(quantity), 0) as total_units_sold
    FROM sale_cogs
    GROUP BY product_id
  `;

  const [fifoCosts] = await pool.query(fifoCostSql);
  const fifoCostMap = new Map();
  fifoCosts.forEach((row) => {
    fifoCostMap.set(row.product_id, {
      cost: Number(row.fifo_cost_per_unit),
      units_sold: Number(row.total_units_sold),
    });
  });

  // Total valuation using FIFO costs from sale_cogs
  const totalSql = `
    SELECT
      COUNT(DISTINCT p.id) AS total_products,
      SUM(p.stock) AS total_units,
      SUM(p.stock * p.price) AS total_selling_value,
      COALESCE(AVG(p.price), 0) AS avg_selling_price
    FROM products p
    WHERE p.status = 'active' AND p.stock > 0
  `;

  const [[totals]] = await pool.query(totalSql);

  // Category-wise breakdown using FIFO
  const categorySql = `
    SELECT
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COUNT(DISTINCT p.id) AS product_count,
      SUM(p.stock) AS total_units,
      SUM(p.stock * p.price) AS selling_value
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active' AND p.stock > 0
    GROUP BY c.id, c.name
    ORDER BY selling_value DESC
  `;

  const [categoryRows] = await pool.query(categorySql);

  // Calculate total using FIFO
  let totalPurchaseValueFIFO = 0;
  for (const [productId, data] of fifoCostMap.entries()) {
    const productSql = `SELECT stock FROM products WHERE id = ? AND status = 'active'`;
    const [[product]] = await pool.query(productSql, [productId]);
    if (product && product.stock > 0) {
      totalPurchaseValueFIFO += product.stock * data.cost;
    }
  }

  // Get products to calculate average cost where no FIFO data exists
  const productsWithoutFIFO = await pool.query(`
    SELECT p.id, p.stock, COALESCE(AVG(pi.price), p.price * 0.5) as avg_cost
    FROM products p
    LEFT JOIN purchase_items pi ON p.id = pi.product_id
    WHERE p.status = 'active' AND p.stock > 0 AND p.id NOT IN (SELECT DISTINCT product_id FROM sale_cogs)
    GROUP BY p.id
  `);

  // Add costs for products without FIFO data
  if (productsWithoutFIFO[0] && productsWithoutFIFO[0].length > 0) {
    for (const row of productsWithoutFIFO[0]) {
      totalPurchaseValueFIFO += row.stock * parseFloat(row.avg_cost);
    }
  }

  const totalSellingValue = parseFloat(totals.total_selling_value || 0);
  const potentialProfit = totalSellingValue - totalPurchaseValueFIFO;
  const profitMargin =
    totalSellingValue > 0 ? (potentialProfit / totalSellingValue) * 100 : 0;

  // Calculate category-wise FIFO costs
  const categoryData = categoryRows.map((row) => {
    let categoryFIFOCost = 0;
    // This is approximate - would need product-level data for perfect accuracy
    // For now, distribute total FIFO cost proportionally to selling value
    if (totalSellingValue > 0) {
      const proportion = parseFloat(row.selling_value || 0) / totalSellingValue;
      categoryFIFOCost = totalPurchaseValueFIFO * proportion;
    }
    return {
      category_name: row.category_name,
      product_count: row.product_count,
      total_units: row.total_units,
      purchase_value_fifo: categoryFIFOCost.toFixed(2),
      selling_value: parseFloat(row.selling_value || 0).toFixed(2),
      potential_profit: (
        parseFloat(row.selling_value || 0) - categoryFIFOCost
      ).toFixed(2),
    };
  });

  return {
    note: "FIFO (First In First Out) inventory valuation using actual cost of goods sold data",
    calculation_method:
      "FIFO using sale_cogs table (most accurate - based on actual sold units and costs)",
    how_it_works:
      "Uses actual FIFO costs from sale_cogs table (where products were sold). For unsold products, uses average purchase price.",
    total_valuation: {
      total_products: totals.total_products,
      total_units: totals.total_units,
      total_purchase_value_fifo: totalPurchaseValueFIFO.toFixed(2),
      total_selling_value: totalSellingValue.toFixed(2),
      potential_profit: potentialProfit.toFixed(2),
      profit_margin: profitMargin.toFixed(2) + "%",
    },
    category_breakdown: categoryData,
  };
}

export async function getDetailedInventoryService(limit = 50) {
  // Get FIFO cost per unit for each product (from actual COGS records)
  const fifoCostSql = `
    SELECT 
      product_id,
      COALESCE(SUM(total_cost) / NULLIF(SUM(quantity), 0), 0) as fifo_cost_per_unit
    FROM sale_cogs
    GROUP BY product_id
  `;

  const [fifoCosts] = await pool.query(fifoCostSql);
  const fifoCostMap = new Map();
  fifoCosts.forEach((row) => {
    fifoCostMap.set(row.product_id, Number(row.fifo_cost_per_unit));
  });

  // Get main product info with calculations using FIFO
  const sql = `
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.sku,
      p.stock AS current_stock,
      p.price AS current_selling_price,
      c.name AS category_name,
      b.name AS brand_name,
      COALESCE(avg_purchase.avg_purchase_price, p.price * 0.5) AS avg_purchase_price,
      COALESCE(avg_purchase.total_purchased, 0) AS total_purchased,
      COALESCE(last_purchase.last_purchase_price, 0) AS last_purchase_price,
      COALESCE(last_purchase.last_purchase_qty, 0) AS last_purchase_qty,
      COALESCE(last_purchase.last_purchase_date, NULL) AS last_purchase_date,
      COALESCE(last_purchase.invoice_no, NULL) AS last_purchase_invoice,
      COALESCE(sold_stats.units_sold_30d, 0) AS units_sold_last_30d
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN (
      SELECT 
        product_id, 
        AVG(price) AS avg_purchase_price,
        SUM(quantity) AS total_purchased
      FROM purchase_items
      WHERE price > 0
      GROUP BY product_id
    ) avg_purchase ON p.id = avg_purchase.product_id
    LEFT JOIN (
      SELECT 
        pi.product_id, 
        pi.price AS last_purchase_price,
        pi.quantity AS last_purchase_qty,
        pu.created_at AS last_purchase_date,
        pu.invoice_no
      FROM purchase_items pi
      INNER JOIN purchases pu ON pi.purchase_id = pu.id
      INNER JOIN (
        SELECT product_id, MAX(pu2.created_at) AS max_date
        FROM purchase_items pi2
        INNER JOIN purchases pu2 ON pi2.purchase_id = pu2.id
        GROUP BY product_id
      ) latest ON pi.product_id = latest.product_id 
        AND pu.created_at = latest.max_date
    ) last_purchase ON p.id = last_purchase.product_id
    LEFT JOIN (
      SELECT 
        si.product_id,
        SUM(si.quantity) AS units_sold_30d
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY si.product_id
    ) sold_stats ON p.id = sold_stats.product_id
    WHERE p.status = 'active' AND p.stock > 0
    ORDER BY (p.stock * p.price) DESC
    LIMIT ?
  `;

  const [products] = await pool.query(sql, [limit]);

  // Get purchase history for each product
  const productIds = products.map((p) => p.product_id);
  let purchaseHistory = [];

  if (productIds.length > 0) {
    const historySql = `
      SELECT 
        pi.product_id,
        pi.quantity,
        pi.price AS unit_price,
        pi.subtotal,
        pu.invoice_no,
        pu.created_at AS purchase_date,
        s.name AS supplier_name
      FROM purchase_items pi
      INNER JOIN purchases pu ON pi.purchase_id = pu.id
      LEFT JOIN suppliers s ON pu.supplier_id = s.id
      WHERE pi.product_id IN (?)
      ORDER BY pi.product_id, pu.created_at DESC
    `;

    [purchaseHistory] = await pool.query(historySql, [productIds]);
  }

  // Group purchase history by product
  const historyByProduct = {};
  purchaseHistory.forEach((ph) => {
    if (!historyByProduct[ph.product_id]) {
      historyByProduct[ph.product_id] = [];
    }
    historyByProduct[ph.product_id].push({
      quantity: ph.quantity,
      unit_price: parseFloat(ph.unit_price).toFixed(2),
      subtotal: parseFloat(ph.subtotal).toFixed(2),
      invoice_no: ph.invoice_no,
      purchase_date: ph.purchase_date,
      supplier_name: ph.supplier_name || "Unknown",
    });
  });

  return {
    note: "Detailed inventory with FIFO-based valuation and complete purchase history - current stock only",
    total_items: products.length,
    products: products.map((row) => {
      const avgPrice = parseFloat(row.avg_purchase_price);
      const lastPrice = parseFloat(row.last_purchase_price);
      const sellingPrice = parseFloat(row.current_selling_price);

      // Use FIFO cost per unit from sale_cogs, fallback to average cost
      const fifoCostPerUnit = fifoCostMap.get(row.product_id) || avgPrice;
      const stock = parseFloat(row.current_stock);

      // Calculate valuations using FIFO costs
      const totalPurchaseValueFIFO = stock * fifoCostPerUnit;
      const totalSellingValue = stock * sellingPrice;
      const potentialProfitFIFO = totalSellingValue - totalPurchaseValueFIFO;
      const profitMarginFIFO =
        totalSellingValue > 0
          ? ((potentialProfitFIFO / totalSellingValue) * 100).toFixed(2)
          : "0";

      return {
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.sku,
        category_name: row.category_name || "Uncategorized",
        brand_name: row.brand_name || "No Brand",
        stock_info: {
          current_stock: row.current_stock,
          total_purchased: row.total_purchased,
          units_sold_last_30d: row.units_sold_last_30d,
        },
        pricing: {
          current_selling_price: sellingPrice.toFixed(2),
          avg_purchase_price: avgPrice.toFixed(2),
          fifo_cost_per_unit: fifoCostPerUnit.toFixed(2),
          last_purchase: {
            price: lastPrice.toFixed(2),
            quantity: row.last_purchase_qty,
            date: row.last_purchase_date,
            invoice_no: row.last_purchase_invoice,
          },
          margin_per_unit_avg: (sellingPrice - avgPrice).toFixed(2),
          margin_per_unit_fifo: (sellingPrice - fifoCostPerUnit).toFixed(2),
        },
        valuation: {
          total_purchase_value_avg: (stock * avgPrice).toFixed(2),
          total_purchase_value_fifo: totalPurchaseValueFIFO.toFixed(2),
          total_selling_value: totalSellingValue.toFixed(2),
          potential_profit_fifo: potentialProfitFIFO.toFixed(2),
          profit_margin_fifo: profitMarginFIFO + "%",
        },
        purchase_history: historyByProduct[row.product_id] || [],
      };
    }),
  };
}

export async function getProductAnalysisService(fromDate, toDate, days = 30) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  // Get FIFO COGS data per product for accurate profit calculation
  const fifoCogsByProductSql = `
    SELECT 
      sc.product_id,
      COALESCE(SUM(sc.total_cost), 0) as total_cogs,
      COALESCE(SUM(sc.quantity), 0) as total_units
    FROM sale_cogs sc
    JOIN sales s ON sc.sale_id = s.id
    WHERE s.status = 'completed'
      AND DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY sc.product_id
  `;

  const [fifoCogsByProduct] = await pool.query(fifoCogsByProductSql, [
    startDate,
    endDate,
  ]);

  // Create map for quick lookup: product_id => {total_cogs, total_units}
  const fifoCogsMap = new Map();
  fifoCogsByProduct.forEach((row) => {
    fifoCogsMap.set(row.product_id, {
      total_cogs: Number(row.total_cogs),
      total_units: Number(row.total_units),
    });
  });

  // 1. TOP SELLING PRODUCTS (by units and revenue) - Uses FIFO COGS
  const topSellersSql = `
    SELECT
      p.id,
      p.name,
      p.sku,
      p.image_url,
      c.name AS category,
      b.name AS brand,
      COALESCE(SUM(si.quantity), 0) AS units_sold,
      COALESCE(SUM(si.subtotal), 0) AS total_revenue,
      p.price AS current_price,
      COALESCE(avg_purchase.avg_price, p.price * 0.5) AS avg_cost,
      p.stock AS current_stock,
      COUNT(DISTINCT si.sale_id) AS transaction_count
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    INNER JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN (
      SELECT product_id, AVG(price) AS avg_price
      FROM purchase_items
      GROUP BY product_id
    ) avg_purchase ON p.id = avg_purchase.product_id
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY p.id, p.name, p.sku, c.name, b.name, p.price, p.stock, avg_purchase.avg_price
    ORDER BY units_sold DESC
    LIMIT 10
  `;

  // 2. BOTTOM SELLING PRODUCTS (lowest sales)
  const bottomSellersSql = `
    SELECT
      p.id,
      p.name,
      p.sku,
      p.image_url,
      c.name AS category,
      b.name AS brand,
      COALESCE(SUM(si.quantity), 0) AS units_sold,
      COALESCE(SUM(si.subtotal), 0) AS total_revenue,
      p.price AS current_price,
      p.stock AS current_stock,
      COALESCE(COUNT(DISTINCT si.sale_id), 0) AS transaction_count
    FROM products p
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) BETWEEN ? AND ?
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.status = 'active'
    GROUP BY p.id, p.name, p.sku, c.name, b.name, p.price, p.stock
    HAVING units_sold <= 2
    ORDER BY units_sold ASC, p.name ASC
    LIMIT 10
  `;

  // 3. HIGHEST PROFIT PRODUCTS (by absolute profit)
  const highestProfitSql = `
    SELECT
      p.id,
      p.name,
      p.sku,
      p.image_url,
      c.name AS category,
      COALESCE(SUM(si.quantity), 0) AS units_sold,
      COALESCE(SUM(si.subtotal), 0) AS total_revenue,
      COALESCE(SUM(si.quantity * COALESCE(avg_purchase.avg_price, p.price * 0.5)), 0) AS total_cost,
      COALESCE(SUM(si.subtotal) - SUM(si.quantity * COALESCE(avg_purchase.avg_price, p.price * 0.5)), 0) AS gross_profit,
      COALESCE(
        ROUND((SUM(si.subtotal) - SUM(si.quantity * COALESCE(avg_purchase.avg_price, p.price * 0.5))) / NULLIF(SUM(si.subtotal), 0) * 100, 2),
        0
      ) AS profit_margin,
      p.stock AS current_stock
    FROM sale_items si
    INNER JOIN sales s ON si.sale_id = s.id
    INNER JOIN products p ON si.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT product_id, AVG(price) AS avg_price
      FROM purchase_items
      GROUP BY product_id
    ) avg_purchase ON p.id = avg_purchase.product_id
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY p.id, p.name, p.sku, c.name, p.price, p.stock, avg_purchase.avg_price
    HAVING gross_profit > 0
    ORDER BY gross_profit DESC
    LIMIT 10
  `;

  // 4. LOWEST MARGIN PRODUCTS (risk products) - Now calculates actual sales margin, not unit price margin
  const lowestMarginSql = `
    SELECT
      p.id,
      p.name,
      p.sku,
      p.image_url,
      c.name AS category,
      COALESCE(SUM(si.quantity), 0) AS units_sold,
      COALESCE(SUM(si.subtotal), 0) AS total_revenue,
      COALESCE(SUM(si.quantity * COALESCE(avg_purchase.avg_price, p.price * 0.5)), 0) AS total_cost,
      COALESCE(
        ROUND((SUM(si.subtotal) - SUM(si.quantity * COALESCE(avg_purchase.avg_price, p.price * 0.5))) / NULLIF(SUM(si.subtotal), 0) * 100, 2),
        0
      ) AS profit_margin,
      p.price AS current_list_price,
      COALESCE(avg_purchase.avg_price, p.price * 0.5) AS avg_cost,
      p.stock AS current_stock
    FROM products p
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) BETWEEN ? AND ?
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT product_id, AVG(price) AS avg_price
      FROM purchase_items
      GROUP BY product_id
    ) avg_purchase ON p.id = avg_purchase.product_id
    WHERE p.status = 'active'
    GROUP BY p.id, p.name, p.sku, c.name, p.price, p.stock, avg_purchase.avg_price
    HAVING units_sold > 0 AND profit_margin < 20
    ORDER BY profit_margin ASC
    LIMIT 10
  `;

  // 5. CATEGORY PERFORMANCE
  const categoryPerformanceSql = `
    SELECT
      c.name AS category_name,
      COUNT(DISTINCT p.id) AS total_products,
      COALESCE(SUM(si.quantity), 0) AS total_units_sold,
      COALESCE(SUM(si.subtotal), 0) AS total_revenue,
      COALESCE(COUNT(DISTINCT si.sale_id), 0) AS transaction_count,
      ROUND(AVG(p.price), 2) AS avg_price,
      ROUND(COALESCE(SUM(si.subtotal), 0) / NULLIF(COUNT(DISTINCT si.sale_id), 0), 2) AS avg_revenue_per_transaction,
      COALESCE(SUM(p.stock), 0) AS total_stock,
      COALESCE(SUM(si.subtotal) - SUM(si.quantity * COALESCE(avg_purchase.avg_price, p.price * 0.5)), 0) AS total_profit,
      ROUND(
        (COALESCE(SUM(si.subtotal), 0) - COALESCE(SUM(si.quantity * COALESCE(avg_purchase.avg_price, p.price * 0.5)), 0)) 
        / NULLIF(SUM(si.subtotal), 0) * 100, 
        2
      ) AS avg_profit_margin
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    LEFT JOIN sale_items si ON p.id = si.product_id
    LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) BETWEEN ? AND ?
    LEFT JOIN (
      SELECT product_id, AVG(price) AS avg_price
      FROM purchase_items
      GROUP BY product_id
    ) avg_purchase ON p.id = avg_purchase.product_id
    WHERE p.status = 'active'
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC
  `;

  // 6. OVERALL PERFORMANCE METRICS
  const metricssSql = `
    SELECT
      COUNT(DISTINCT p.id) AS total_active_products,
      COUNT(DISTINCT CASE WHEN si.id IS NOT NULL THEN p.id ELSE NULL END) AS products_sold,
      COUNT(DISTINCT CASE WHEN si.id IS NULL THEN p.id ELSE NULL END) AS products_unsold,
      COALESCE(SUM(si.quantity), 0) AS total_units_sold,
      COALESCE(SUM(si.subtotal), 0) AS total_revenue,
      ROUND(COALESCE(SUM(si.subtotal), 0) / NULLIF(COUNT(DISTINCT si.sale_id), 0), 2) AS avg_transaction_value,
      ROUND(AVG(p.price), 2) AS avg_product_price,
      (SELECT COALESCE(SUM(stock), 0) FROM products WHERE status = 'active') AS total_inventory_units,
      COUNT(DISTINCT si.sale_id) AS total_transactions
    FROM products p
    LEFT JOIN sale_items si ON p.id = si.product_id AND EXISTS (
      SELECT 1 FROM sales s WHERE s.id = si.sale_id AND DATE(s.created_at) BETWEEN ? AND ?
    )
    WHERE p.status = 'active'
  `;

  const [topSellers] = await pool.query(topSellersSql, [startDate, endDate]);
  const [bottomSellers] = await pool.query(bottomSellersSql, [
    startDate,
    endDate,
    startDate,
    endDate,
  ]);
  const [highestProfit] = await pool.query(highestProfitSql, [
    startDate,
    endDate,
  ]);
  const [lowestMargin] = await pool.query(lowestMarginSql, [
    startDate,
    endDate,
  ]);
  const [categoryPerf] = await pool.query(categoryPerformanceSql, [
    startDate,
    endDate,
  ]);
  const [[metrics]] = await pool.query(metricssSql, [startDate, endDate]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    overview_metrics: {
      total_active_products: metrics.total_active_products,
      products_sold: metrics.products_sold,
      products_unsold: metrics.products_unsold,
      sell_through_rate:
        metrics.total_active_products > 0
          ? (
              (metrics.products_sold / metrics.total_active_products) *
              100
            ).toFixed(2) + "%"
          : "0%",
      total_units_sold: metrics.total_units_sold || 0,
      total_revenue: parseFloat(metrics.total_revenue || 0).toFixed(2),
      avg_transaction_value: parseFloat(
        metrics.avg_transaction_value || 0,
      ).toFixed(2),
      avg_product_price: parseFloat(metrics.avg_product_price || 0).toFixed(2),
      total_inventory_units: metrics.total_inventory_units || 0,
      total_transactions: metrics.total_transactions || 0,
    },
    top_sellers: topSellers.map((row) => {
      const fifoCogs = fifoCogsMap.get(row.id) || {
        total_cogs: 0,
        total_units: 0,
      };
      const fifoGrossCost =
        fifoCogs.total_cogs || row.units_sold * parseFloat(row.avg_cost);
      const fifoGrossProfit = row.total_revenue - fifoGrossCost;
      const fifoMargin =
        row.total_revenue > 0
          ? ((fifoGrossProfit / row.total_revenue) * 100).toFixed(2)
          : 0;

      return {
        product_id: row.id,
        product_name: row.name,
        sku: row.sku,
        image: row.image_url,
        category: row.category || "Uncategorized",
        brand: row.brand || "No Brand",
        units_sold: row.units_sold,
        total_revenue: parseFloat(row.total_revenue || 0).toFixed(2),
        current_price: parseFloat(row.current_price || 0).toFixed(2),
        avg_cost: parseFloat(row.avg_cost || 0).toFixed(2),
        gross_profit: parseFloat(fifoGrossProfit || 0).toFixed(2),
        profit_margin: fifoMargin + "%",
        current_stock: row.current_stock,
        transaction_count: row.transaction_count,
        note:
          fifoCogs.total_cogs > 0 ? "Using FIFO COGS" : "Using average cost",
      };
    }),
    bottom_sellers: bottomSellers.map((row) => ({
      product_id: row.id,
      product_name: row.name,
      sku: row.sku,
      image: row.image_url,
      category: row.category || "Uncategorized",
      brand: row.brand || "No Brand",
      units_sold: row.units_sold,
      total_revenue: parseFloat(row.total_revenue).toFixed(2),
      current_price: parseFloat(row.current_price).toFixed(2),
      current_stock: row.current_stock,
      transaction_count: row.transaction_count,
      note: row.units_sold === 0 ? "Never sold" : "Very low sales",
    })),
    highest_profit_products: highestProfit.map((row) => {
      const fifoCogs = fifoCogsMap.get(row.id) || {
        total_cogs: 0,
        total_units: 0,
      };
      const fifoTotalCost = fifoCogs.total_cogs || row.total_cost;
      const fifoGrossProfit = row.total_revenue - fifoTotalCost;
      const fifoMargin =
        row.total_revenue > 0
          ? ((fifoGrossProfit / row.total_revenue) * 100).toFixed(2)
          : 0;

      return {
        product_id: row.id,
        product_name: row.name,
        sku: row.sku,
        image: row.image_url,
        category: row.category || "Uncategorized",
        units_sold: row.units_sold,
        total_revenue: parseFloat(row.total_revenue || 0).toFixed(2),
        total_cost: parseFloat(fifoTotalCost || 0).toFixed(2),
        gross_profit: parseFloat(fifoGrossProfit || 0).toFixed(2),
        profit_margin: fifoMargin + "%",
        current_stock: row.current_stock,
        note: fifoCogs.total_cogs > 0 ? "FIFO costed" : "Avg cost used",
      };
    }),
    lowest_margin_products: lowestMargin.map((row) => {
      const fifoCogs = fifoCogsMap.get(row.id) || {
        total_cogs: 0,
        total_units: 0,
      };
      const fifoTotalCost = fifoCogs.total_cogs || row.total_cost;
      const fifoGrossProfit = row.total_revenue - fifoTotalCost;
      const fifoMargin =
        row.total_revenue > 0
          ? ((fifoGrossProfit / row.total_revenue) * 100).toFixed(2)
          : 0;

      return {
        product_id: row.id,
        product_name: row.name,
        sku: row.sku,
        image: row.image_url,
        category: row.category || "Uncategorized",
        units_sold: row.units_sold,
        total_revenue: parseFloat(row.total_revenue || 0).toFixed(2),
        total_cost: parseFloat(fifoTotalCost || 0).toFixed(2),
        gross_profit: parseFloat(fifoGrossProfit || 0).toFixed(2),
        profit_margin: fifoMargin + "%",
        current_list_price: parseFloat(row.current_list_price || 0).toFixed(2),
        avg_cost: parseFloat(row.avg_cost || 0).toFixed(2),
        current_stock: row.current_stock,
        note: fifoCogs.total_cogs > 0 ? "FIFO costed" : "Avg cost used",
        recommendation: "Consider price increase or cost reduction",
      };
    }),
    category_performance: categoryPerf.map((row) => ({
      category_name: row.category_name,
      total_products: row.total_products,
      total_units_sold: row.total_units_sold || 0,
      total_revenue: parseFloat(row.total_revenue || 0).toFixed(2),
      transaction_count: row.transaction_count || 0,
      avg_price: parseFloat(row.avg_price || 0).toFixed(2),
      avg_revenue_per_transaction: parseFloat(
        row.avg_revenue_per_transaction || 0,
      ).toFixed(2),
      total_stock: row.total_stock || 0,
      total_profit: parseFloat(row.total_profit || 0).toFixed(2),
      avg_profit_margin: (row.avg_profit_margin || 0) + "%",
    })),
  };
}

async function calculateFifoCogs(fromDate, toDate) {
  // Simpler approach: Use sale_cogs table directly if available, fallback to recalculation
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

  // If sale_cogs has data for this period, use it (faster and more accurate)
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

  // Fallback: Recalculate FIFO from scratch (for old data without sale_cogs)
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

  console.log("FIFO Debug - Events processed:", events.length);
  console.log("FIFO Debug - Total COGS:", totalCogs);
  console.log("FIFO Debug - Units sold in range:", totalUnitsSoldInRange);

  return {
    total_cogs: totalCogs,
    total_units_sold: totalUnitsSoldInRange,
  };
}

// COMPREHENSIVE FINANCIAL ANALYSIS - Industry Standard
export async function getComprehensiveFinancialAnalysisService(
  fromDate,
  toDate,
  days = 30,
) {
  const startDate = fromDate;
  const endDate = toDate;

  // 1. REVENUE ANALYSIS
  const revenueSql = `
    SELECT
      COALESCE(SUM(s.total_amount), 0) AS total_revenue,
      COALESCE(COUNT(DISTINCT s.id), 0) AS total_transactions,
      COALESCE(SUM(s.total_amount) / NULLIF(COUNT(DISTINCT s.id), 0), 0) AS avg_transaction_value,
      COALESCE(MIN(s.total_amount), 0) AS min_transaction_value,
      COALESCE(MAX(s.total_amount), 0) AS max_transaction_value,
      COALESCE(STDDEV(s.total_amount), 0) AS transaction_value_stddev,
      COALESCE(COUNT(DISTINCT s.customer_id), 0) AS unique_customers,
      COALESCE(SUM(s.total_amount) / NULLIF(COUNT(DISTINCT s.customer_id), 0), 0) AS avg_revenue_per_customer,
      COALESCE(COUNT(DISTINCT s.user_id), 0) AS num_transactions_by_staff,
      ROUND(
        (COALESCE(SUM(CASE WHEN s.due_amount = 0 THEN s.total_amount ELSE 0 END), 0) / 
         NULLIF(SUM(s.total_amount), 0)) * 100, 2
      ) AS cash_collection_rate,
      COALESCE(SUM(s.due_amount), 0) AS total_due_amount
    FROM sales s
    WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
  `;

  // 2. COST OF GOODS SOLD (COGS) & GROSS PROFIT
  const cogsSql = `
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
  `;

  // 3. OPERATING EXPENSES
  const expensesSql = `
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
  `;

  // 5. PAYMENT COLLECTION & RECEIVABLES
  const receivablesSql = `
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
  `;

  // 6. PAYMENT METHODS
  const paymentMethodSql = `
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
  `;

  // 7. TAX ANALYSIS
  const taxSql = `
    SELECT
      COALESCE(SUM(s.tax), 0) AS total_tax_collected, 
      COALESCE(SUM(s.subtotal), 0) AS taxable_sales,
      ROUND(
        COALESCE(SUM(s.tax), 0) / NULLIF(COALESCE(SUM(s.subtotal), 0), 0) * 100, 2
      ) AS effective_tax_rate,
      COUNT(DISTINCT s.id) AS taxable_transactions
    FROM sales s
    WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
  `;

  // 8. INVENTORY VALUATION
  const inventorySql = `
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
      ) AS inventory_value_at_cost,
      ROUND(
        ((SELECT COALESCE(SUM(stock * price), 0) FROM products WHERE status = 'active') - 
         (SELECT COALESCE(SUM(p.stock * COALESCE(pi.avg_price, p.price * 0.5)), 0)
          FROM products p
          LEFT JOIN (
            SELECT product_id, AVG(price) AS avg_price
            FROM purchase_items
            GROUP BY product_id
          ) pi ON p.id = pi.product_id
          WHERE p.status = 'active'
         )) / 
        NULLIF((SELECT COALESCE(SUM(stock * price), 0) FROM products WHERE status = 'active'), 0) * 100, 2
      ) AS inventory_markup_percent
  `;

  // 9. DAILY AVERAGE ANALYSIS
  const dailyAvgSql = `
    SELECT
      ROUND(COALESCE(SUM(s.total_amount), 0) / NULLIF(COUNT(DISTINCT DATE(s.created_at)), 0), 2) AS avg_daily_revenue,
      ROUND(COALESCE(SUM(si.quantity), 0) / NULLIF(COUNT(DISTINCT DATE(s.created_at)), 0), 2) AS avg_daily_units_sold,
      COUNT(DISTINCT DATE(s.created_at)) AS business_days,
      COALESCE(SUM(s.total_amount), 0) / NULLIF(COUNT(DISTINCT s.user_id), 0) AS avg_revenue_per_staff
    FROM sales s
    JOIN sale_items si ON s.id = si.sale_id
    WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?
  `;

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
    pool.query(revenueSql, [fromDate, toDate]),
    pool.query(cogsSql, [fromDate, toDate]),
    pool.query(expensesSql, [fromDate, toDate]),
    pool.query(receivablesSql, [fromDate, toDate]),
    pool.query(paymentMethodSql, [fromDate, toDate]),
    pool.query(taxSql, [fromDate, toDate]),
    pool.query(inventorySql, []),
    pool.query(dailyAvgSql, [fromDate, toDate]),
    calculateFifoCogs(fromDate, toDate),
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
    period: { from_date: fromDate, to_date: toDate, days },

    // REVENUE ANALYTICS
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

    // GROSS PROFIT ANALYSIS
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

    // OPERATING EXPENSES
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

    // NET PROFIT & PROFITABILITY RATIOS
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

    // RECEIVABLES & CASH FLOW
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

    // PAYMENT METHOD BREAKDOWN - Updated for schema
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

    // TAX ANALYSIS
    tax_analysis: {
      total_tax_collected: parseFloat(tax.total_tax_collected || 0).toFixed(2),
      taxable_sales: parseFloat(tax.taxable_sales || 0).toFixed(2),
      effective_tax_rate: (tax.effective_tax_rate || 0) + "%",
      taxable_transactions: tax.taxable_transactions || 0,
    },

    // INVENTORY VALUATION
    inventory_valuation: {
      total_inventory_units: inventory.total_inventory_units || 0,
      total_sku_count: inventory.total_sku_count || 0,
      inventory_value_at_retail: parseFloat(
        inventory.inventory_value_at_retail || 0,
      ).toFixed(2),
      inventory_value_at_cost: parseFloat(
        inventory.inventory_value_at_cost || 0,
      ).toFixed(2),
      inventory_markup_percent: (inventory.inventory_markup_percent || 0) + "%",
    },

    // DAILY AVERAGES
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
