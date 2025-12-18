import express from "express";
import pool from "../config/db.js";

import upload from "../config/cloudinary.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let { page = 1, limit = 8, search = "", stock = "all", category = "all" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    let params = [];
    let countParams = [];

    // 🔍 SEARCH FILTER
    if (search) {
      whereClause += " AND p.name LIKE ?";
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // 📦 STOCK FILTER
    if (stock === "in") {
      whereClause += " AND p.stock > 0";
    } else if (stock === "out") {
      whereClause += " AND p.stock = 0";
    }

    // 🏷 CATEGORY FILTER
    if (category !== "all") {
      whereClause += " AND p.category_id = ?";
      params.push(category);
      countParams.push(category);
    }

    // 📌 GET DATA QUERY
    const dataSql = `
      SELECT 
        p.id, p.name, p.description, p.sku, p.price, p.stock, p.image_url,
        b.name AS brand_name,
        c.name AS category_name,
        p.created_at, p.updated_at
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;

    // 📌 COUNT TOTAL QUERY
    const countSql = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
    `;

    // Add pagination params only for the data query
    params.push(limit, offset);

    const [rows] = await pool.query(dataSql, params);
    const [countRows] = await pool.query(countSql, countParams);

    const total = countRows[0]?.total || 0;

    res.json({
      success: true,
      message: "Fetched successfully",
      data: rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in GET /products:", err);
    res.status(500).json({ error: err.message });
  }
});


/* -----------------------------
   POST /products  (Create Product)
------------------------------ */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, description, sku, brand_id, category_id, stock = 0 } = req.body;
    const image_url = req.file ? req.file.path : null;
    const price = parseFloat(req.body.price);

    if (!name || !sku || isNaN(price)) {
      return res.status(400).json({ error: "Name, SKU, and valid Price required" });
    }

    const [result] = await pool.query(
      `INSERT INTO products 
      (name, description, sku, price, brand_id, category_id, image_url, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, sku, price, brand_id, category_id, image_url, stock]
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: {
        id: result.insertId,
        name,
        image_url,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

/* -----------------------------
   PUT /products/:id  (Update Product)
------------------------------ */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, description, sku, price, brand_id, category_id } = req.body;
    const image_url = req.file ? req.file.path : req.body.image_url;

    const [result] = await pool.query(`
      UPDATE products 
      SET name=?, description=?, sku=?, price=?, brand_id=?, category_id=?, image_url=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `, [name, description, sku, price, brand_id, category_id, image_url, req.params.id]);

    if (!result.affectedRows)
      return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

/* -----------------------------
   DELETE /products/:id
------------------------------ */
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);

    if (!result.affectedRows)
      return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
