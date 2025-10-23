import express from "express";
import pool from "../db.js";
import upload from "../config/cloudinary.js";

const router = express.Router();

// ✅ 1. GET all products (with brand + category info)
router.get("/", async (req, res) => {
  let { page, limit, search } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 8;

  const offset = (page - 1) * limit;

  try {
    let countsql = `SELECT COUNT(*) as total FROM products p`;
    const params = [];
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

    if (search) {
      sql += ` WHERE p.name LIKE ?`;
      countsql += ` WHERE p.name LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
    params.push(limit,offset);

    const [rows, fields] = await pool.query(sql, params);
    const [countRows] = await pool.query(
      countsql,
      search ? [`%${search}%`] : []
    );
    const total = countRows[0].total;

    res.json({
      success: true,
      message: "Fetched successfully",
      data: rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ 2. GET single product by ID
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

//
// router.get("/:id", async (req, res) => {
//   try {
//     const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [
//       req.params.id,
//     ]);
//     if (rows.length === 0)
//       return res.status(404).json({ error: "Product not found" });
//     res.json(rows[0]);
//   } catch (err) {
//     console.error("Error fetching product:", err);
//     res.status(500).json({ error: "Failed to fetch product" });
//   }
// });

// ✅ 3. POST - Create new product (with image upload)
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
      [name, description, sku, price, brand_id, category_id, image_url, stock]
    );

    res
      .status(201)
      .json({ message: "Product created successfully", id: result.insertId });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ✅ 4. PUT - Update product
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

// ✅ 5. DELETE product
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
