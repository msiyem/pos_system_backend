import express from "express";
import upload from "../config/cloudinary.js";
import { getProducts, addProduct, updateProduct, deleteProduct } from "../controllers/products.controller.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.get("/products",authorize("admin","staff") , getProducts);
router.post("/products", upload.single("image"),authorize("admin","staff") , addProduct);
router.put("/products/:id", upload.single("image"),authorize("admin","staff") , updateProduct);
router.delete("/products/:id",authorize("admin","staff") , deleteProduct);

export default router;
