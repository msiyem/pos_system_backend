import express from "express";
import upload from "../config/cloudinary.js";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/products.controller.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.get("/products", authorize("admin", "staff"), getProducts);
router.post(
  "/products",
  authorize("admin", "staff"),
  upload.single("image"),
  addProduct
);
router.put(
  "/products/:id",
  authorize("admin", "staff"),
  upload.single("image"),
  updateProduct
);
router.delete("/products/:id", authorize("admin", "staff"), deleteProduct);

export default router;
