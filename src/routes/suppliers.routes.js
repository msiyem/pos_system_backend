import express from "express";
import {
  addSupplier,
  getSuppliers,
  getSupplierDetails,
  deleteSupplier,
  updateSupplier,
} from "../controllers/suppliers.controller.js";
import {authorize} from "../middleware/authorize.js";
import upload from "../config/cloudinary.js";

const router = express.Router();

router.post(
  "/suppliers",
  authorize("admin"),
  upload.single("image"),
  addSupplier
);

router.get("/suppliers", authorize("admin"), getSuppliers);

router.get("/suppliers/:id/details", getSupplierDetails);
router.put(
  "/suppliers/:id",
  authorize("admin"),
  upload.single("image"),
  updateSupplier
);

router.delete("/suppliers/:id", authorize("admin"), deleteSupplier);

export default router;
