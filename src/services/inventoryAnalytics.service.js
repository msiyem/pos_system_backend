import pool from "../config/db.js";


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


export async function getReorderRecommendationsService(days = 30) {
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

  let totalPurchaseValueFIFO = 0;
  for (const [productId, data] of fifoCostMap.entries()) {
    const productSql = `SELECT stock FROM products WHERE id = ? AND status = 'active'`;
    const [[product]] = await pool.query(productSql, [productId]);
    if (product && product.stock > 0) {
      totalPurchaseValueFIFO += product.stock * data.cost;
    }
  }

  const productsWithoutFIFO = await pool.query(`
    SELECT p.id, p.stock, COALESCE(AVG(pi.price), p.price * 0.5) as avg_cost
    FROM products p
    LEFT JOIN purchase_items pi ON p.id = pi.product_id
    WHERE p.status = 'active' AND p.stock > 0 AND p.id NOT IN (SELECT DISTINCT product_id FROM sale_cogs)
    GROUP BY p.id
  `);

  if (productsWithoutFIFO[0] && productsWithoutFIFO[0].length > 0) {
    for (const row of productsWithoutFIFO[0]) {
      totalPurchaseValueFIFO += row.stock * parseFloat(row.avg_cost);
    }
  }

  const totalSellingValue = parseFloat(totals.total_selling_value || 0);
  const potentialProfit = totalSellingValue - totalPurchaseValueFIFO;
  const profitMargin =
    totalSellingValue > 0 ? (potentialProfit / totalSellingValue) * 100 : 0;

  const categoryData = categoryRows.map((row) => {
    let categoryFIFOCost = 0;
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
    note: "FIFO (First In First Out) inventory valuation",
    calculation_method: "Using sale_cogs table for actual FIFO costs",
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
    note: "Detailed inventory with FIFO-based valuation",
    total_items: products.length,
    products: products.map((row) => {
      const avgPrice = parseFloat(row.avg_purchase_price);
      const lastPrice = parseFloat(row.last_purchase_price);
      const sellingPrice = parseFloat(row.current_selling_price);

      const fifoCostPerUnit = fifoCostMap.get(row.product_id) || avgPrice;
      const stock = parseFloat(row.current_stock);

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
          margin_per_unit_fifo: (sellingPrice - fifoCostPerUnit).toFixed(2),
        },
        valuation: {
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
