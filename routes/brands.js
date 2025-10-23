import express from "express";
import pool from "../db.js";

const router = express.Router();

// ✅ Get all brands
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM brands ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
});

// ✅ Add a new brand
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Brand name is required" });

    await pool.query("INSERT INTO brands (name, description) VALUES (?, ?)", [name, description]);
    res.json({ message: "Brand added successfully" });
  } catch (err) {
    console.error("Error adding brand:", err);
    res.status(500).json({ error: "Failed to add brand" });
  }
});

// ✅ Update brand
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    await pool.query("UPDATE brands SET name=?, description=? WHERE id=?", [name, description, id]);
    res.json({ message: "Brand updated successfully" });
  } catch (err) {
    console.error("Error updating brand:", err);
    res.status(500).json({ error: "Failed to update brand" });
  }
});

// ✅ Delete brand
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM brands WHERE id=?", [id]);
    res.json({ message: "Brand deleted successfully" });
  } catch (err) {
    console.error("Error deleting brand:", err);
    res.status(500).json({ error: "Failed to delete brand" });
  }
});

export default router;
