import express from "express";
import {
  getInventoryLogs,
  addInventoryLog,
  deleteInventoryLog,
} from "../controllers/inventory.controller.js";
// import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get(
  "/inventory",
  // authenticate,
  getInventoryLogs
);

router.post(
  "/inventory",
  // authenticate,
  // authorize("admin"),
  addInventoryLog
);

router.delete(
  "/inventory/:id",
  // authenticate,
  // authorize("admin"),
  deleteInventoryLog
);

export default router;
