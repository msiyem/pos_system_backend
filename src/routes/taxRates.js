import express from "express";
import pool from "../config/db.js";


const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tax_rates ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching tax rates:", err);
    res.status(500).json({ error: "Failed to fetch tax rates" });
  }
});


router.post("/", async (req, res) => {
  try {
    const { name, rate } = req.body;
    if (!name || rate == null)
      return res.status(400).json({ error: "Name and rate are required" });

    await pool.query("INSERT INTO tax_rates (name, rate) VALUES (?, ?)", [name, rate]);
    res.json({ message: "Tax rate added successfully" });
  } catch (err) {
    console.error("Error adding tax rate:", err);
    res.status(500).json({ error: "Failed to add tax rate" });
  }
});


router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rate } = req.body;

    await pool.query("UPDATE tax_rates SET name=?, rate=? WHERE id=?", [name, rate, id]);
    res.json({ message: "Tax rate updated successfully" });
  } catch (err) {
    console.error("Error updating tax rate:", err);
    res.status(500).json({ error: "Failed to update tax rate" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM tax_rates WHERE id=?", [id]);
    res.json({ message: "Tax rate deleted successfully" });
  } catch (err) {
    console.error("Error deleting tax rate:", err);
    res.status(500).json({ error: "Failed to delete tax rate" });
  }
});

export default router;
