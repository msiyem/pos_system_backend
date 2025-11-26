import express from "express";
import pool from "../db.js";
import upload from "../config/cloudinary.js";

const router = express.Router();

router.get("/", async (req, res) => {
  let { page, limit, search } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 8;
  const offset = (page - 1) * limit;

  try {
    let params = [];
    let countParams = [];

    let countsql = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    let sql = `
      SELECT 
        p.id, p.name, p.description, p.sku, p.price, p.stock, p.image_url,
        b.name AS brand_name,
        c.name AS category_name,
        p.created_at, p.updated_at
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
    `;

    // 🔍 Handle search filters
    if (search) {
      const lowerSearch = search.toLowerCase();

      if (["in stock", "available", "has stock"].includes(lowerSearch)) {
        sql += " WHERE p.stock > 0";
        countsql += " WHERE p.stock > 0";
      } else if (["out of stock", "unavailable", "no stock"].includes(lowerSearch)) {
        sql += " WHERE p.stock = 0";
        countsql += " WHERE p.stock = 0";
      } else {
        sql += " WHERE p.name LIKE ? OR c.name LIKE ?";
        countsql += " WHERE p.name LIKE ? OR c.name LIKE ?";
        params.push(`%${search}%`, `%${search}%`);
        countParams = [...params];
      }
    }

    sql += " ORDER BY p.id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    const [countRows] = await pool.query(countsql, countParams);

    const total = countRows.length > 0 ? countRows[0].total : 0;

    res.json({
      success: true,
      message: "Fetched successfully",
      data: rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("Error in GET /products:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        p.id, p.name, p.description, p.sku, p.price,p.stock, p.image_url,
        b.name AS brand_name,
        c.name AS category_name,
        p.created_at, p.updated_at
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?

    `,
      [id]
    );
    if (rows.length == 0) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});


router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, description, sku, price, brand_id, category_id, stock } =
      req.body;
    const image_url = req.file ? req.file.path : null;

    if (!name || !sku || !price) {
      return res
        .status(400)
        .json({ error: "Name, SKU, and Price are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO products 
        (name, description, sku, price, brand_id, category_id, image_url,stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, sku, price, brand_id, category_id, image_url, 0]
    );

    res
      .status(201)
      .json({
        success: true,
        message: "Product created successfully",
        product: { id: result.insertId, name, image_url },
      });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, description, sku, price, brand_id, category_id } = req.body;
    const image_url = req.file ? req.file.path : req.body.image_url;

    const [result] = await pool.query(
      `UPDATE products 
       SET name=?, description=?, sku=?, price=?, brand_id=?, category_id=?, image_url=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
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

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
