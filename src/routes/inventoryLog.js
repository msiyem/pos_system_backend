import express from "express";
import pool from "../config/db.js";


const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT il.*, p.name AS product_name
      FROM inventory_log il
      LEFT JOIN products p ON il.product_id = p.id
      ORDER BY il.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching inventory logs:", err);
    res.status(500).json({ error: "Failed to fetch inventory logs" });
  }
});


router.post("/", async (req, res) => {
  try {
    const { product_id, change_type, quantity, note } = req.body;

    if (!product_id || !change_type || !quantity)
      return res.status(400).json({ error: "Missing required fields" });

    await pool.query(
      "INSERT INTO inventory_log (product_id, change_type, quantity, note) VALUES (?, ?, ?, ?)",
      [product_id, change_type, quantity, note]
    );

    res.json({ message: "Inventory log added successfully" });
  } catch (err) {
    console.error("Error adding inventory log:", err);
    res.status(500).json({ error: "Failed to add inventory log" });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM inventory_log WHERE id=?", [id]);
    res.json({ message: "Inventory log deleted successfully" });
  } catch (err) {
    console.error("Error deleting inventory log:", err);
    res.status(500).json({ error: "Failed to delete inventory log" });
  }
});

export default router;
