import express from "express";
import {checkoutSale, completePending, getAllPendingSales, getAllSales, savePendingSale } from "../controllers/sales.controller.js";
// import {authorize} from "../middlewares/authorize.js"
const router = express.Router();

router.post(
  "/sales/checkout",
  // authorize("admin", "staff"),
  checkoutSale
);

router.post(
  "/sales/pending",
  savePendingSale
)

router.post(
  "/sales/complete_pending",
  completePending
)

router.get(
  "/sales/pending",
  getAllPendingSales
)

router.get(
  "/sales",
  getAllSales
);


export default router;
