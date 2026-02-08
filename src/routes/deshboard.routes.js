import express from "express";
import {
  getMainDashboard,
  getDashboardTransactions,
  getUserTransactions,
  getMyTransactions,
  getUserTransactionSummary,
  getMyTransactionSummary,
  getFinancialSummary,
  getDailySalesTrend,
  getTopProducts,
  getCustomerAnalysis,
  getComprehensiveCustomerAnalysis,
  getStaffPerformance,
  getPaymentBreakdown,
  getTaxSummary,
  getProfitLossStatement,
  getInventoryAlerts,
  getStockMovement,
  getReorderRecommendations,
  getInventoryValuation,
  getDetailedInventory,
  getProductAnalysis,
  getComprehensiveFinancialAnalysis,
} from "../controllers/desboard.controller.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.get("/dashboard/main", authorize("admin", "staff"), getMainDashboard);

router.get(
  "/dashboard/transactions",
  authorize("admin"),
  getDashboardTransactions,
);

router.get("/users/:id/transactions", authorize("admin"), getUserTransactions);
router.get("/users/:id/summary", authorize("admin"), getUserTransactionSummary);
router.get(
  "/users/:id/transactions/summary",
  authorize("admin"),
  getUserTransactionSummary,
);

router.get(
  "/users/me/transactions",
  authorize("admin", "staff"),
  getMyTransactions,
);
router.get(
  "/users/me/summary",
  authorize("admin", "staff"),
  getMyTransactionSummary,
);

router.get(
  "/dashboard/financial-summary",
  authorize("admin"),
  getFinancialSummary,
);

router.get("/dashboard/daily-trends", authorize("admin"), getDailySalesTrend);

router.get("/dashboard/top-products", authorize("admin"), getTopProducts);

router.get(
  "/dashboard/customer-analysis",
  authorize("admin"),
  getCustomerAnalysis,
);


router.get(
  "/dashboard/customer-analysis/comprehensive",
  authorize("admin"),
  getComprehensiveCustomerAnalysis,
);

router.get(
  "/dashboard/staff-performance",
  authorize("admin"),
  getStaffPerformance,
);

router.get(
  "/dashboard/payment-breakdown",
  authorize("admin"),
  getPaymentBreakdown,
);

router.get("/dashboard/tax-summary", authorize("admin"), getTaxSummary);


router.get(
  "/dashboard/profit-loss",
  authorize("admin"),
  getProfitLossStatement,
);

router.get(
  "/dashboard/inventory/alerts",
  authorize("admin"),
  getInventoryAlerts,
);

router.get(
  "/dashboard/inventory/movement",
  authorize("admin"),
  getStockMovement,
);

router.get(
  "/dashboard/inventory/reorder-recommendations",
  authorize("admin"),
  getReorderRecommendations,
);

router.get(
  "/dashboard/inventory/valuation",
  authorize("admin"),
  getInventoryValuation,
);

router.get(
  "/dashboard/inventory/detailed",
  authorize("admin"),
  getDetailedInventory,
);

router.get(
  "/dashboard/product-analysis",
  authorize("admin"),
  getProductAnalysis,
);

router.get(
  "/dashboard/financial-analysis",
  authorize("admin"),
  getComprehensiveFinancialAnalysis,
);

export default router;
