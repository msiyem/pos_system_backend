// services/tax.service.js
import pool from "../config/db.js";

export async function getAllTaxRates() {
  const [rows] = await pool.query(
    "SELECT * FROM tax_rates ORDER BY id DESC"
  );
  return rows;
}

export async function createTaxRate(name, rate) {
  await pool.query(
    "INSERT INTO tax_rates (name, rate) VALUES (?, ?)",
    [name, rate]
  );
}

export async function updateTaxRate(id, name, rate) {
  await pool.query(
    "UPDATE tax_rates SET name=?, rate=? WHERE id=?",
    [name, rate, id]
  );
}

export async function deleteTaxRate(id) {
  await pool.query(
    "DELETE FROM tax_rates WHERE id=?",
    [id]
  );
}
