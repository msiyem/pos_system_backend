import { getExpensesService, addExpenseService } from "../services/expenses.service.js";

// Get all expenses
export async function getExpenses(req, res) {
  try {
    const rows = await getExpensesService();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
}

// Add expense
export async function addExpense(req, res) {
  try {
    const { title, amount } = req.body;
    await addExpenseService(title, amount);
    res.json({ message: "Expense added" });
  } catch (err) {
    console.error("Error adding expense:", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
}
