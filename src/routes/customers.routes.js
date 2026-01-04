import express from "express";
import upload from "../config/cloudinary.js";
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
router.post(
  "/customers/",
  authorize("admin", "staff"),
  upload.single("image"),
  addCustomer
);
router.put(
  "/customers/:id",
  authorize("admin", "staff"),
  upload.single("image"),
  // (req, res, next) => {
  //   console.log("AFTER MULTER BODY:", req.body);
  //   console.log("AFTER MULTER FILE:", req.file);
  //   next();
  // },
  updateCustomer
);
router.delete("/customers/:id", authorize("admin", "staff"), deleteCustomer);

export default router;
