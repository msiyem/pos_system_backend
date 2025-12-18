import express from "express";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categories.controller.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.get("/categories",authorize("admin","staff") , getCategories);
router.post("/categories",authorize("admin","staff") , addCategory);
router.put("/categories/:id",authorize("admin","staff") , updateCategory);
router.delete("/categories/:id",authorize("admin","staff") , deleteCategory);

export default router;
