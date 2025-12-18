import express from "express";
import pool from "../config/db.js";


const router = express.Router();

router.post("/", async (req, res) => {
  const { title, amount } = req.body;
  await pool.query(
    "INSERT INTO expenses (title, amount) VALUES (?,?)",
    [title, amount]
  );
  res.json({ message: "Expense added" });
});

router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM expenses ORDER BY id DESC");
  res.json(rows);
});

export default router;
