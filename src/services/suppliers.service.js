import pool from "../config/db.js";

// Add Supplier
export async function addSupplierService(data) {
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
  } = data;

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

  return rows.insertId;
}

// Get all suppliers (with pagination + search)
export async function getSuppliersService(query) {
  let { page, limit, search } = query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 9;
  const offset = (page - 1) * limit;

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

  return {
    data: rows,
    total: countRows[0].total,
    page,
    limit,
  };
}

// Get supplier details
export async function getSupplierDetailsService(id) {
  const [rows] = await pool.query(
    `SELECT
      s.*,
      DATE_FORMAT(s.birthday, '%d-%m-%Y') AS birthday,
      DATE_FORMAT(CONVERT_TZ(s.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS created_at,
      DATE_FORMAT(CONVERT_TZ(s.last_transition,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS last_transition
     FROM suppliers s
     WHERE s.id = ?`,
    [id]
  );

  return rows;
}

// Delete supplier
export async function deleteSupplierService(id) {
  await pool.query("DELETE FROM suppliers WHERE id=?", [id]);
}
