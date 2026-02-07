import pool from "../config/db.js";

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
      SUM(si.quantity) AS units_sold,
      SUM(si.subtotal) AS total_revenue,
      p.price AS current_price,
      COUNT(DISTINCT si.sale_id) AS transaction_count,
      (SUM(si.subtotal) / NULLIF(SUM(si.quantity), 0)) AS avg_price_per_unit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY p.id, p.name, p.price
    ORDER BY total_revenue DESC
    LIMIT ?
  `;

  const [rows] = await pool.query(sql, [startDate, endDate, limit]);

  return {
    period: { fromDate: startDate, toDate: endDate },
    top_products: rows.map((row) => ({
      product_id: row.id,
      product_name: row.product_name,
      units_sold: row.units_sold,
      total_revenue: parseFloat(row.total_revenue).toFixed(2),
      current_price: parseFloat(row.current_price).toFixed(2),
      transaction_count: row.transaction_count,
      avg_price_per_unit: parseFloat(row.avg_price_per_unit || 0).toFixed(2),
    })),
  };
}


export async function getProductAnalysisService(fromDate, toDate, days = 30) {
  const startDate = fromDate?.trim() || null;
  const endDate = toDate?.trim() || null;

  if (!startDate || !endDate) {
    throw new Error("fromDate and toDate are required");
  }

  // Get FIFO COGS data per product
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

  const fifoCogsMap = new Map();
  fifoCogsByProduct.forEach((row) => {
    fifoCogsMap.set(row.product_id, {
      total_cogs: Number(row.total_cogs),
      total_units: Number(row.total_units),
    });
  });

  // 1. TOP SELLING PRODUCTS
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

  // 2. BOTTOM SELLING PRODUCTS
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

  // 3. HIGHEST PROFIT PRODUCTS
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

  // 4. CATEGORY PERFORMANCE
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
    })),
    highest_profit_products: highestProfit.map((row) => ({
      product_id: row.id,
      product_name: row.name,
      sku: row.sku,
      image: row.image_url,
      category: row.category || "Uncategorized",
      units_sold: row.units_sold,
      total_revenue: parseFloat(row.total_revenue || 0).toFixed(2),
      total_cost: parseFloat(row.total_cost || 0).toFixed(2),
      gross_profit: parseFloat(row.gross_profit || 0).toFixed(2),
      current_stock: row.current_stock,
    })),
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
