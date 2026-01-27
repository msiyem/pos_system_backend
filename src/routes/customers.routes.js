import express from "express";
import upload from "../config/cloudinary.js";
import {
  getCustomers,
  getCustomerDetails,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerTransaction,
  getCustomerSalesItemsController,
  getCustomerTransactionSummary,
} from "../controllers/customers.controller.js";
import { authorize } from "../middleware/authorize.js";
import {
  getCustomerPurchaseSummaryController,
  getCustomerSaleProducts,
  getCutomerPurchasedProducts,
} from "../controllers/sales.controller.js";
import {
  duePaymentController,
  getDueDetailsController,
} from "../controllers/duepayment.controller.js";

const router = express.Router();

router.get("/customers", authorize("admin", "staff"), getCustomers);
router.get(
  "/customers/:id/details",
  authorize("admin", "staff"),
  getCustomerDetails,
);
router.get("/customers/:id/transactions", getCustomerTransaction);

router.get(
  "/customers/:id/transactions/summary",
  getCustomerTransactionSummary,
);

router.get(
  "/customers/:customerId/sales/:saleId/items",
  getCustomerSalesItemsController,
);

router.get(
  "/customers/:customerId/purchased_products",
  getCutomerPurchasedProducts,
);

router.get(
  "/customers/:customerId/products_summary",
  getCustomerPurchaseSummaryController,
);

router.get(
  "/customers/:customer_id/purchased_products/:product_id",
  getCustomerSaleProducts,
);

router.get("/customers/:customer_id/dues", getDueDetailsController);

router.post(
  "/customers/",
  authorize("admin", "staff"),
  upload.single("image"),
  addCustomer,
);

router.post("/customers/:customer_id/dues", duePaymentController);

router.put(
  "/customers/:id",
  authorize("admin", "staff"),
  upload.single("image"),
  // (req, res, next) => {
  //   console.log("AFTER MULTER BODY:", req.body);
  //   console.log("AFTER MULTER FILE:", req.file);
  //   next();
  // },
  updateCustomer,
);
router.delete("/customers/:id", authorize("admin", "staff"), deleteCustomer);

export default router;
