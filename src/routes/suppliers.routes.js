import express from "express";
import {
  addSupplier,
  getSuppliers,
  getSupplierDetails,
  deleteSupplier,
} from "../controllers/suppliers.controller.js";
// import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.post(
  "/suppliers",
  // authenticate,
  // authorize("admin"),
  addSupplier
);

router.get(
  "/suppliers",
  // authenticate,
  getSuppliers
);

router.get(
  "/suppliers/:id/details",
  // authenticate,
  getSupplierDetails
);

router.delete(
  "/suppliers/:id",
  // authenticate,
  // authorize("admin"),
  deleteSupplier
);

export default router;
