import pool from "../config/db.js";

// find user by email
export async function getUserByEmail(email) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows[0]; // undefined if not found
}
