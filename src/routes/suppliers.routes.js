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
import { getSupplierOverallSummaryController, getSupplierPurchaseItemsController, getSupplierSupliesSpecificProductController, getSupplierSuppliesProductsController, getSupplierTransaction, getSupplierTransactionSummary } from "../controllers/purchases.controller.js";
import { getSupplierDueDetailsController, supplierDuePaymentController } from "../controllers/duepayment.controller.js";

const router = express.Router();


router.get("/suppliers", authorize("admin"), getSuppliers);

router.get("/suppliers/:id/details", getSupplierDetails);

router.get("/suppliers/:supplier_id/products",
  getSupplierSuppliesProductsController
)

router.get("/suppliers/:supplier_id/products_summary",
  getSupplierOverallSummaryController
);

router.get("/suppliers/:supplier_id/supplied/:product_id",
  getSupplierSupliesSpecificProductController
)

router.get(
  '/suppliers/:id/transactions',
  getSupplierTransaction
);

router.get(
  "/suppliers/:id/transactions/summary",
  getSupplierTransactionSummary
);

router.get(
  '/suppliers/:supplierId/purchases/:purchaseId/items',
  getSupplierPurchaseItemsController
);

router.get(
  "/suppliers/:supplier_id/dues",
  getSupplierDueDetailsController
);

router.post(
  "/suppliers",
  authorize("admin"),
  upload.single("image"),
  addSupplier
);

router.post(
  "/suppliers/:supplier_id/due-payment",
  supplierDuePaymentController
);

router.put(
  "/suppliers/:id",
  authorize("admin"),
  upload.single("image"),
  updateSupplier
);

router.delete("/suppliers/:id", authorize("admin"), deleteSupplier);

export default router;
