import bcrypt from "bcrypt";
import pool from "../config/db.js";

export async function createFirstAdmin() {
  const [admins] = await pool.query(
    `SELECT u.id from users u
    WHERE u.role = 'admin'
    LIMIT 1`
  );
  if (admins.length > 0) {
    console.log("✔ Admin already exists");
    return;
  }

  const hashedPass = await bcrypt.hash("admin123", 12);

  await pool.query(
    `INSERT INTO users (name,username,email,password,role)
    VALUES (?,?,?,?,?)`,
    ["superAdmin", "superadmin", "admin@gmail.com", hashedPass, "admin"]
  );
} 
