import pool from "../config/db.js";

// Get all expenses
export async function getExpensesService() {
  const [rows] = await pool.query("SELECT * FROM expenses ORDER BY id DESC");
  return rows;
}

// Add expense
export async function addExpenseService(title, amount) {
  await pool.query("INSERT INTO expenses (title, amount) VALUES (?, ?)", [title, amount]);
}
