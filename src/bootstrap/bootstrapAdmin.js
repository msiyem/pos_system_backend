import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import pool from "../config/db.js";
import { env } from "../config/env.js";

export async function createFirstAdmin() {
  if (env.nodeEnv === "production") {
    console.log("Bootstrap admin skipped in production");
    return;
  }

  if (!env.bootstrap.enabled) {
    console.log("Bootstrap admin disabled");
    return;
  }

  if (env.bootstrap.once) {
    const markerPath = path.resolve(env.bootstrap.onceFile);
    if (fs.existsSync(markerPath)) {
      console.log("Bootstrap admin already completed");
      return;
    }
  }

  const { name, username, email, password } = env.bootstrap;
  if (!name || !username || !email || !password) {
    console.log("Bootstrap admin skipped: missing env credentials");
    return;
  }

  const [admins] = await pool.query(
    `SELECT u.id from users u
    WHERE u.role = 'admin'
    LIMIT 1`,
  );
  if (admins.length > 0) {
    console.log("✔ Admin already exists");
    return;
  }

  const hashedPass = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (name,username,email,password,role)
    VALUES (?,?,?,?,?)`,
    [name, username, email, hashedPass, "admin"],
  );

  if (env.bootstrap.once) {
    const markerPath = path.resolve(env.bootstrap.onceFile);
    const markerDir = path.dirname(markerPath);
    if (!fs.existsSync(markerDir)) {
      fs.mkdirSync(markerDir, { recursive: true });
    }
    fs.writeFileSync(markerPath, new Date().toISOString(), "utf8");
  }
}
