import express from "express";
import {
  createPurchase,
  getPurchases,
} from "../controllers/purchases.controller.js";
// import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.post(
  "/purchase",
  // authenticate,
  // authorize("admin"),
  createPurchase
);

router.get(
  "/purchase",
  // authenticate,
  getPurchases
);

export default router;
