import express from "express";
import pool from "../db.js";
import upload from "../config/cloudinary.js";

const router = express.Router();

/* -----------------------------
   GET /products  (List + Search)
------------------------------ */
router.get("/", async (req, res) => {
  try {
    let { page = 1, limit = 8, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];
    let countParams = [];

    // Search Handling
    if (search.trim()) {
      const s = search.trim().toLowerCase();

      if (["in stock", "available", "has stock"].includes(s)) {
        conditions.push("p.stock > 0");
      } else if (["out of stock", "no stock", "unavailable"].includes(s)) {
        conditions.push("p.stock = 0");
      } else {
        conditions.push(
          `(p.name LIKE ? OR p.sku LIKE ? OR c.name LIKE ? OR b.name LIKE ?)`
        );
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
    }

    let where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    // Main Query
    const sql = `
      SELECT 
        p.id, p.name, p.description, p.sku, p.price, p.stock, p.image_url,
        b.name AS brand_name,
        c.name AS category_name,
        p.created_at, p.updated_at
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;

    // Count Query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${where}
    `;

    // Count Params should not include LIMIT/OFFSET
    countParams = [...params];

    // Add LIMIT & OFFSET to main params
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
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
   GET /products/:id  (Single Product)
------------------------------ */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        p.id, p.name, p.description, p.sku, p.price, p.stock, p.image_url,
        b.name AS brand_name,
        c.name AS category_name,
        p.created_at, p.updated_at
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `,
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Product not found" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* -----------------------------
   POST /products  (Create Product)
------------------------------ */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      description,
      sku,
      brand_id,
      category_id,
      stock = 0,
    } = req.body;
    const image_url = req.file ? req.file.path : null;
    const price = parseFloat(req.body.price);

    // Basic Validation
    if (!name || !sku || isNaN(price)) {
      return res
        .status(400)
        .json({ error: "Name, SKU, and valid Price required" });
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

    const [result] = await pool.query(
      `
      UPDATE products 
      SET name=?, description=?, sku=?, price=?, brand_id=?, category_id=?, image_url=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
      `,
      [
        name,
        description,
        sku,
        price,
        brand_id,
        category_id,
        image_url,
        req.params.id,
      ]
    );

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
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [
      req.params.id,
    ]);

    if (!result.affectedRows)
      return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
