import express from "express";
import pool from "../config/db.js";


const router = express.Router();

// Add Supplier
router.post("/", async (req, res) => {
  try {
    const {
      name,
      gender,
      birthday,
      phone,
      alt_phone,
      whatsapp,
      email,
      division,
      district,
      city,
      area,
      post_code,
      sector,
      road,
      house,
    } = req.body;
    const [rows] = await pool.query(
      `INSERT INTO suppliers (
      name,
      gender,
      birthday,
      phone,
      alt_phone,
      whatsapp,
      email,
      division,
      district,
      city,
      area,
      post_code,
      sector,
      road,
      house
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        name,
        gender,
        birthday,
        phone,
        alt_phone,
        whatsapp,
        email,
        division,
        district,
        city,
        area,
        post_code,
        sector,
        road,
        house,
      ]
    );
    const supplierId = rows.insertId;
    res.status(201).json({
      success: true,
      message: `Supplier added Successfull! ID = ${supplierId}`,
      supplierId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed!" });
  }
});

// Get all suppliers
router.get("/", async (req, res) => {
  let { page, limit, search } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 9;
  const offset = (page - 1) * limit;

  try {
    let sql = `
      SELECT
        s.*,
        DATE_FORMAT(s.birthday, '%d-%m-%Y') AS birthday,
        DATE_FORMAT(CONVERT_TZ(s.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS created_at,
        DATE_FORMAT(CONVERT_TZ(s.last_transition,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS last_transition
      FROM suppliers s
    `;

    let countsql = `SELECT COUNT(*) as total FROM suppliers s`;
    const params = [];

    if (search) {
      sql += ` WHERE (s.name LIKE ? OR s.phone LIKE ?)`;
      countsql += ` WHERE (s.name LIKE ? OR s.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY s.id LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    const [countRows] = await pool.query(
      countsql,
      search ? [`%${search}%`, `%${search}%`] : []
    );

    const total = countRows[0].total;

    res.json({
      success: true,
      message: "Fetched Successfully",
      data: rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/:id/details", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
        s.*,
        DATE_FORMAT(s.birthday, '%d-%m-%Y') AS birthday,
        DATE_FORMAT(CONVERT_TZ(s.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS created_at,
        DATE_FORMAT(CONVERT_TZ(s.last_transition,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS last_transition
      FROM suppliers s
    WHERE s.id = ?
    `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json({
      success: true,
      message: "Fetched Successfully",
      data: rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete supplier
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM suppliers WHERE id=?", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
