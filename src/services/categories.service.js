import pool from "../config/db.js";

// Get all categories
export async function getCategoriesService() {
  const [rows] = await pool.query("SELECT * FROM categories");
  return rows;
}

// Add category
export async function addCategoryService(name) {
  await pool.query("INSERT INTO categories (name) VALUES (?)", [name]);
}

// Update category
export async function updateCategoryService(id, name) {
  await pool.query("UPDATE categories SET name=? WHERE id=?", [name, id]);
}

// Delete category
export async function deleteCategoryService(id) {
  await pool.query("DELETE FROM categories WHERE id=?", [id]);
}
