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

// =====================================================
// MAIN DASHBOARD - DEFAULT/LIMITED CRITICAL DATA
// =====================================================

// Main Dashboard Route (DEFAULT)
// Best Practice: Quick overview of critical metrics on user login
// Includes: Overview, Top Customers, Top Products, Critical Alerts, Recent Transactions
router.get("/dashboard/main", authorize("admin", "staff"), getMainDashboard);

// Transaction Routes
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

// =====================================================
// FINANCIAL METRICS ROUTES - INDUSTRY STANDARD
// =====================================================

// Financial Summary Route
router.get(
  "/dashboard/financial-summary",
  authorize("admin"),
  getFinancialSummary,
);

// Daily Sales Trends Route
router.get("/dashboard/daily-trends", authorize("admin"), getDailySalesTrend);

// Top Products Route
router.get("/dashboard/top-products", authorize("admin"), getTopProducts);

// Customer Analysis Route
router.get(
  "/dashboard/customer-analysis",
  authorize("admin"),
  getCustomerAnalysis,
);

// =====================================================
// COMPREHENSIVE CUSTOMER ANALYSIS ROUTE
// =====================================================

// Comprehensive Customer Analysis - Industry Standard
// Includes: Overview, Top Customers, Segmentation, CLV, Purchase Behavior,
// Long Time Due Customers, Retention/Churn, Geographic Distribution, Demographics, Recent Activity
router.get(
  "/dashboard/customer-analysis/comprehensive",
  authorize("admin"),
  getComprehensiveCustomerAnalysis,
);

// Staff Performance Route
router.get(
  "/dashboard/staff-performance",
  authorize("admin"),
  getStaffPerformance,
);

// Payment Method Breakdown Route
router.get(
  "/dashboard/payment-breakdown",
  authorize("admin"),
  getPaymentBreakdown,
);

// Tax Summary Route
router.get("/dashboard/tax-summary", authorize("admin"), getTaxSummary);

// Profit & Loss Statement Route
router.get(
  "/dashboard/profit-loss",
  authorize("admin"),
  getProfitLossStatement,
);

// =====================================================
// INVENTORY MANAGEMENT ROUTES
// =====================================================

// Inventory Alerts Route - Low stock, out of stock, overstock
router.get(
  "/dashboard/inventory/alerts",
  authorize("admin"),
  getInventoryAlerts,
);

// Stock Movement Analysis Route - Fast/slow moving products
router.get(
  "/dashboard/inventory/movement",
  authorize("admin"),
  getStockMovement,
);

// Reorder Recommendations Route - Smart reordering suggestions
router.get(
  "/dashboard/inventory/reorder-recommendations",
  authorize("admin"),
  getReorderRecommendations,
);

// Inventory Valuation Route - Total stock value
router.get(
  "/dashboard/inventory/valuation",
  authorize("admin"),
  getInventoryValuation,
);

// Detailed Inventory Route - Product-level breakdown with purchase history
router.get(
  "/dashboard/inventory/detailed",
  authorize("admin"),
  getDetailedInventory,
);

// =====================================================
// PRODUCT ANALYSIS ROUTES
// =====================================================

// Product Analysis Route - Top/Bottom sellers, profit analysis, category performance
router.get(
  "/dashboard/product-analysis",
  authorize("admin"),
  getProductAnalysis,
);

// =====================================================
// COMPREHENSIVE FINANCIAL ANALYSIS ROUTE
// =====================================================

// Comprehensive Financial Analysis - Industry Standard
// Includes: Revenue, COGS, Gross Profit, Operating Expenses, Net Profit,
// Receivables, Payment Methods, Tax, Inventory Valuation, KPIs
router.get(
  "/dashboard/financial-analysis",
  authorize("admin"),
  getComprehensiveFinancialAnalysis,
);

export default router;
