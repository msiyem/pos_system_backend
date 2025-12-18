import express from "express";
import { createSale, getSales } from "../controllers/sales.controller.js";
// import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.post(
  "/sales",
  // authenticate,
  // authorize("admin", "cashier"),
  createSale
);

router.get(
  "/sales",
  // authenticate,
  getSales
);

export default router;
