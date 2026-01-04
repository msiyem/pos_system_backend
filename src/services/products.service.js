import { cloudinary } from "../config/cloudinary.js";
import pool from "../config/db.js";

// Get products with filters
export async function getProductsService({
  page = 1,
  limit = 8,
  search = "",
  stock = "all",
  category = "all",
  brand = "all",
}) {
  page = parseInt(page);
  limit = parseInt(limit);
  const offset = (page - 1) * limit;

  let whereClause = "WHERE 1=1";
  let params = [];
  let countParams = [];

  if (search) {
    whereClause += " AND p.name LIKE ?";
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  if (stock === "in") whereClause += " AND p.stock > 0";
  else if (stock === "out") whereClause += " AND p.stock = 0";

  if (category !== "all") {
    whereClause += " AND p.category_id = ?";
    params.push(category);
    countParams.push(category);
  }

  if (brand !== "all") {
    whereClause += " AND p.brand_id = ?";
    params.push(brand);
    countParams.push(brand);
  }

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

  const countSql = `
    SELECT COUNT(*) AS total
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    ${whereClause}
  `;

  params.push(limit, offset);

  const [rows] = await pool.query(dataSql, params);
  const [countRows] = await pool.query(countSql, countParams);

  return { rows, total: countRows[0]?.total || 0, page, limit };
}

export async function getProductByIdService(id) {
  const [rows] = await pool.query("SELECT  *  FROM products WHERE id = ?", [
    id,
  ]);
  return rows[0];
}

// Add product
export async function addProductService({
  name,
  description,
  sku,
  price,
  brand_id,
  category_id,
  image_url,
  image_public_id,
}) {
  const [result] = await pool.query(
    `INSERT INTO products 
      (name, description, sku, price, brand_id, category_id, image_url, image_public_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description,
      sku,
      price,
      brand_id,
      category_id,
      image_url,
      image_public_id,
    ]
  );
  return result.insertId;
}

// Update product
export async function updateProductService(
  id,
  data,
  image_url,
  image_public_id
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[old]] = await conn.query("SELECT * FROM products WHERE id =?", [
      id,
    ]);
    if (!old) throw new Error("Product not found!");
    if (
      (image_public_id && old.image_public_id) ||
      (image_url === null && old.image_public_id)
    ) {
      await cloudinary.uploader.destroy(old.image_public_id);
    }

    await pool.query(
      `UPDATE products 
     SET name=?, description=?, sku=?, status=?, price=?, brand_id=?, category_id=?, image_url=?, image_public_id=? updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
      [
        data.name ?? old.name,
        data.description ?? old.description,
        data.sku ?? old.sku,
        data.status ?? old.status,
        data.price ?? old.price,
        data.brand_id ?? old.brand_id,
        data.category_id ?? old.category_id,
        data.image_url ?? old.image_url,
        data.image_public_id ?? old.image_public_id,
        id,
      ]
    );
  } catch (err) {
    await conn.rollback();
    throw err;
  }finally{
    conn.release();
  }
}

// Delete product
export async function deleteProductService(id) {
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows;
}
