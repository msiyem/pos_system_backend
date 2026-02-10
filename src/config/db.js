import fs from "fs";
import mysql from "mysql2/promise";
import { env } from "./env.js";

const ssl = env.db.sslCa
  ? {
      ca: fs.readFileSync(env.db.sslCa, "utf8"),
      rejectUnauthorized: true,
    }
  : undefined;

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,        
  password: env.db.password,
  database: env.db.name,

  ...(ssl ? { ssl } : {}),

  waitForConnections: true,
  connectionLimit: 5,       
  queueLimit: 0,
  connectTimeout: 20000,
});



export default pool;
