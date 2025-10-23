import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
      u.*,
      DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+00:00'), '%Y-%m-%d %r') AS created_at,
      DATE_FORMAT(CONVERT_TZ(updated_at, '+00:00', '+00:00'), '%Y-%m-%d %r') AS updated_at
      FROM users u`);
    res.json({
      success: true,
      message: "Fetched successfully",
      data: rows,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
