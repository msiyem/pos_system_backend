import pool from "../config/db.js";

// Get inventory logs
export async function getInventoryLogsService() {
  const [rows] = await pool.query(`
    SELECT il.*, p.name AS product_name
    FROM inventory_log il
    LEFT JOIN products p ON il.product_id = p.id
    ORDER BY il.id DESC
  `);

  return rows;
}

// Add inventory log
export async function addInventoryLogService(data) {
  const { product_id, change_type, quantity, note } = data;

  if (!product_id || !change_type || !quantity)
    throw new Error("Missing required fields");

  await pool.query(
    "INSERT INTO inventory_log (product_id, change_type, quantity, note) VALUES (?, ?, ?, ?)",
    [product_id, change_type, quantity, note]
  );
}

// Delete inventory log
export async function deleteInventoryLogService(id) {
  await pool.query("DELETE FROM inventory_log WHERE id=?", [id]);
}
