// routes/tax.routes.js
import express from "express";
import {
  getTaxes,
  addTax,
  editTax,
  removeTax
} from "../controllers/tax.controller.js";
import {authorize} from "../middleware/authenticate.js";

const router = express.Router();

router.get("/tax-rates",authorize("admin"), getTaxes);
router.post("/tax-rates",authorize("admin"), addTax);
router.put("/tax-rates/:id",authorize("admin"), editTax);
router.delete("/tax-rates/:id",authorize("admin"), removeTax);

export default router;
