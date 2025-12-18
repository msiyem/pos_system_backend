import express from "express";
import {
  getBrands,
  addBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brands.controller.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.get("/brands",authorize("admin","staff") , getBrands);
router.post("/brands",authorize("admin","staff") , addBrand);
router.put("/brands/:id",authorize("admin","staff") , updateBrand);
router.delete("/brands/:id",authorize("admin","staff") , deleteBrand);

export default router;

