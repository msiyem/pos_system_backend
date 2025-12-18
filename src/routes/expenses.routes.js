import express from "express";
import { getExpenses, addExpense } from "../controllers/expenses.controller.js";
// import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get("/expenses", getExpenses);
router.post("/expenses", addExpense);

export default router;
