import express from "express";
import {
  getCustomers,
  getCustomerDetails,
  addCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customers.controller.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.get("/customers", authorize("admin", "staff"), getCustomers);
router.get(
  "/customers/:id/details",
  authorize("admin", "staff"),
  getCustomerDetails
);
router.post("/customers/", authorize("admin", "staff"), addCustomer);
router.put("/customers/:id", authorize("admin", "staff"), updateCustomer);
router.delete("/customers/:id", authorize("admin", "staff"), deleteCustomer);

export default router;
