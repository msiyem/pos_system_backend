import express from "express";
import pool from "../db.js";

const router = express.Router();

// ✅ Get all categories
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ✅ Add category
router.post("/", async (req, res) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    await pool.query("INSERT INTO categories (name, parent_id) VALUES (?, ?)", [name, parent_id]);
    res.json({ message: "Category added successfully" });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ error: "Failed to add category" });
  }
});

// ✅ Update category
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;

    await pool.query("UPDATE categories SET name=?, parent_id=? WHERE id=?", [name, parent_id, id]);
    res.json({ message: "Category updated successfully" });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// ✅ Delete category
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM categories WHERE id=?", [id]);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
