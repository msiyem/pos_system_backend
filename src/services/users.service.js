import pool from "../config/db.js";

export async function getAllUsersService() {
  const [rows] = await pool.query(`
    SELECT 
      u.*,
      DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+00:00'), '%Y-%m-%d %r') AS created_at,
      DATE_FORMAT(CONVERT_TZ(updated_at, '+00:00', '+00:00'), '%Y-%m-%d %r') AS updated_at
    FROM users u
  `);
  return rows;
}
