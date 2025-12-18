import pool from "../config/db.js";

// Get all brands
export async function getBrandsService() {
  const [rows] = await pool.query("SELECT * FROM brands ORDER BY id DESC");
  return rows;
}

// Add brand
export async function addBrandService(name, description) {
  await pool.query("INSERT INTO brands (name, description) VALUES (?, ?)", [name, description]);
}

// Update brand
export async function updateBrandService(id, name, description) {
  await pool.query("UPDATE brands SET name=?, description=? WHERE id=?", [name, description, id]);
}

// Delete brand
export async function deleteBrandService(id) {
  await pool.query("DELETE FROM brands WHERE id=?", [id]);
}
