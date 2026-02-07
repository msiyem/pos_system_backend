import logger from "../utils/logger.js";
import {
  getAllTransactionHistoryService,
  getAllTransactionCountService,
  getUserTransactionHistoryService,
  getUserTransactionCountService,
  getUserTransactionSummaryService,
  getFinancialSummaryService,
  getDailySalesTrendService,
  getTopProductsByRevenueService,
  getCustomerPaymentAnalysisService,
  getComprehensiveCustomerAnalysisService,
  getSalesPerformanceByStaffService,
  getPaymentMethodBreakdownService,
  getTaxSummaryService,
  getProfitLossStatementService,
  getInventoryAlertsService,
  getStockMovementService,
  getReorderRecommendationsService,
  getInventoryValuationService,
  getDetailedInventoryService,
  getProductAnalysisService,
  getComprehensiveFinancialAnalysisService,
} from "../services/desboard.servics.js";
import { getMainDashboardService } from "../services/dashboard.main.service.js";

// Constants
const VALID_TRANSACTION_TYPES = ["Sale", "Payment", "DuePayment", "Refund"];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function getMainDashboard(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "fromDate cannot be later than toDate",
      });
    }

    const data = await getMainDashboardService(fromDate, toDate);

    return res.status(200).json({
      success: true,
      message: "Main dashboard fetched successfully",
      data,
      meta: {
        timestamp: new Date().toLocaleDateString("en-CA", {
          timeZone: "Asia/Dhaka",
        }),
        userId: req.user?.id,
        query_params: { fromDate, toDate },
      },
    });
  } catch (err) {
    logger.error("getMainDashboard", {
      error: err.message,
      stack: err.stack,
      user: req.user?.id,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch main dashboard",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

export async function getDashboardTransactions(req, res) {
  try {
    let { fromDate, toDate, type, page = 1, limit = DEFAULT_LIMIT } = req.query;

    // Validation
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(Math.max(1, Number(limit) || DEFAULT_LIMIT), MAX_LIMIT);

    // Sanitize type filter
    const cleanType =
      type && VALID_TRANSACTION_TYPES.includes(type) ? type : undefined;

    // Validate date format if provided
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate format. Use YYYY-MM-DD",
      });
    }
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate format. Use YYYY-MM-DD",
      });
    }

    const data = await getAllTransactionHistoryService({
      fromDate,
      toDate,
      type: cleanType,
      page,
      limit,
    });

    const total = await getAllTransactionCountService({
      fromDate,
      toDate,
      type: cleanType,
    });

    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully",
      data,
      pagination: {
        total,
        totalPage: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getDashboardTransactions", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard transactions",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

export async function getUserTransactions(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isFinite(userId) || userId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    let { fromDate, toDate, type, page = 1, limit = DEFAULT_LIMIT } = req.query;

    page = Math.max(1, Number(page) || 1);
    limit = Math.min(Math.max(1, Number(limit) || DEFAULT_LIMIT), MAX_LIMIT);

    const cleanType =
      type && VALID_TRANSACTION_TYPES.includes(type) ? type : undefined;

    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate format. Use YYYY-MM-DD",
      });
    }
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate format. Use YYYY-MM-DD",
      });
    }

    const data = await getUserTransactionHistoryService({
      userId,
      fromDate,
      toDate,
      type: cleanType,
      page,
      limit,
    });

    const total = await getUserTransactionCountService({
      userId,
      fromDate,
      toDate,
      type: cleanType,
    });

    return res.status(200).json({
      success: true,
      message: "User transactions fetched successfully",
      data,
      pagination: {
        total,
        totalPage: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId,
        requestedBy: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getUserTransactions", {
      error: err.message,
      userId: req.params.id,
      user: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch user transactions",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

export async function getMyTransactions(req, res) {
  try {
    let { fromDate, toDate, type, page = 1, limit = DEFAULT_LIMIT } = req.query;

    page = Math.max(1, Number(page) || 1);
    limit = Math.min(Math.max(1, Number(limit) || DEFAULT_LIMIT), MAX_LIMIT);

    const cleanType =
      type && VALID_TRANSACTION_TYPES.includes(type) ? type : undefined;

    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate format. Use YYYY-MM-DD",
      });
    }
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate format. Use YYYY-MM-DD",
      });
    }

    const data = await getUserTransactionHistoryService({
      userId: req.user.id,
      fromDate,
      toDate,
      type: cleanType,
      page,
      limit,
    });

    const total = await getUserTransactionCountService({
      userId: req.user.id,
      fromDate,
      toDate,
      type: cleanType,
    });

    return res.status(200).json({
      success: true,
      message: "Your transactions fetched successfully",
      data,
      pagination: {
        total,
        totalPage: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user.id,
      },
    });
  } catch (err) {
    logger.error("getMyTransactions", {
      error: err.message,
      user: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch your transactions",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

export async function getUserTransactionSummary(req, res) {
  try {
    const userId = Number(req.params.id);
    const { fromDate, toDate, type, limit = DEFAULT_LIMIT } = req.query;

    if (!Number.isFinite(userId) || userId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate format. Use YYYY-MM-DD",
      });
    }
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate format. Use YYYY-MM-DD",
      });
    }

    const data = await getUserTransactionSummaryService(
      userId,
      fromDate,
      toDate,
    );

    const total = Number(data?.summary?.total_transactions || 0);

    return res.status(200).json({
      success: true,
      message: "User transaction summary fetched successfully",
      total_transactions: data?.summary?.total_transactions || 0,
      sale_count: data?.summary?.sale_count || 0,
      payment_count: data?.summary?.payment_count || 0,
      duepayment_count: data?.summary?.duepayment_count || 0,
      refund_count: data?.summary?.refund_count || 0,
      pagination: {
        totalPage: Math.ceil(total / Number(limit)),
        total,
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId,
        requestedBy: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getUserTransactionSummary", {
      error: err.message,
      userId: req.params.id,
      user: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch user transaction summary",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

export async function getMyTransactionSummary(req, res) {
  try {
    const { fromDate, toDate, type, limit = DEFAULT_LIMIT } = req.query;

    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate format. Use YYYY-MM-DD",
      });
    }
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate format. Use YYYY-MM-DD",
      });
    }

    const data = await getUserTransactionSummaryService(
      req.user.id,
      fromDate,
      toDate,
    );

    const total = Number(data?.summary?.total_transactions || 0);

    return res.status(200).json({
      success: true,
      message: "Your transaction summary fetched successfully",
      total_transactions: data?.summary?.total_transactions || 0,
      sale_count: data?.summary?.sale_count || 0,
      payment_count: data?.summary?.payment_count || 0,
      duepayment_count: data?.summary?.duepayment_count || 0,
      refund_count: data?.summary?.refund_count || 0,
      pagination: {
        totalPage: Math.ceil(total / Number(limit)),
        total,
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user.id,
      },
    });
  } catch (err) {
    logger.error("getMyTransactionSummary", {
      error: err.message,
      user: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch your transaction summary",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

// =====================================================
// FINANCIAL METRICS CONTROLLERS - INDUSTRY STANDARD
// =====================================================

/**
 * Get comprehensive financial summary
 * Endpoint: GET /dashboard/financial-summary?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 */
export async function getFinancialSummary(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    // Validate date format if provided
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate format. Use YYYY-MM-DD",
      });
    }
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate format. Use YYYY-MM-DD",
      });
    }

    const data = await getFinancialSummaryService(fromDate, toDate);

    return res.status(200).json({
      success: true,
      message: "Financial summary fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getFinancialSummary", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch financial summary",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get daily sales trends
 * Endpoint: GET /dashboard/daily-trends?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 */
export async function getDailySalesTrend(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const data = await getDailySalesTrendService(fromDate, toDate);

    return res.status(200).json({
      success: true,
      message: "Daily sales trends fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getDailySalesTrend", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily sales trends",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get top products by revenue
 * Endpoint: GET /dashboard/top-products?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&limit=10
 */
export async function getTopProducts(req, res) {
  try {
    const { fromDate, toDate, limit = 10 } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const data = await getTopProductsByRevenueService(
      fromDate,
      toDate,
      Math.min(parseInt(limit) || 10, 50),
    );

    return res.status(200).json({
      success: true,
      message: "Top products fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getTopProducts", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch top products",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get customer payment analysis
 * Endpoint: GET /dashboard/customer-analysis?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 */
export async function getCustomerAnalysis(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const data = await getCustomerPaymentAnalysisService(fromDate, toDate);

    return res.status(200).json({
      success: true,
      message: "Customer analysis fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getCustomerAnalysis", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer analysis",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * COMPREHENSIVE CUSTOMER ANALYSIS - INDUSTRY STANDARD
 * Endpoint: GET /dashboard/comprehensive-customer-analysis?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 *
 * Returns complete customer insights including:
 * - Customer overview metrics
 * - Top customers by revenue
 * - Customer segmentation (VIP, Regular, Occasional, One-Time)
 * - Customer lifetime value (CLV)
 * - Purchase behavior patterns
 * - Long time due customers (aging buckets)
 * - Retention & churn analysis
 * - Geographic distribution
 * - Demographics insights
 * - Recent customer activity
 */
export async function getComprehensiveCustomerAnalysis(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    // Validate required parameters
    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    // Validate date format
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Validate date range
    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "fromDate cannot be later than toDate",
      });
    }

    // Get comprehensive customer analysis
    const data = await getComprehensiveCustomerAnalysisService(
      fromDate,
      toDate,
    );

    return res.status(200).json({
      success: true,
      message: "Comprehensive customer analysis fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        query_params: {
          fromDate,
          toDate,
        },
      },
    });
  } catch (err) {
    logger.error("getComprehensiveCustomerAnalysis", {
      error: err.message,
      stack: err.stack,
      user: req.user?.id,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      message: "Failed to fetch comprehensive customer analysis",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get staff sales performance
 * Endpoint: GET /dashboard/staff-performance?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 */
export async function getStaffPerformance(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const data = await getSalesPerformanceByStaffService(fromDate, toDate);

    return res.status(200).json({
      success: true,
      message: "Staff performance fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getStaffPerformance", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff performance",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get payment method breakdown
 * Endpoint: GET /dashboard/payment-breakdown?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 */
export async function getPaymentBreakdown(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const data = await getPaymentMethodBreakdownService(fromDate, toDate);

    return res.status(200).json({
      success: true,
      message: "Payment breakdown fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getPaymentBreakdown", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment breakdown",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get tax summary
 * Endpoint: GET /dashboard/tax-summary?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 */
export async function getTaxSummary(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const data = await getTaxSummaryService(fromDate, toDate);

    return res.status(200).json({
      success: true,
      message: "Tax summary fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getTaxSummary", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch tax summary",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get profit & loss statement
 * Endpoint: GET /dashboard/profit-loss?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 */
export async function getProfitLossStatement(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate are required. Use YYYY-MM-DD format",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const data = await getProfitLossStatementService(fromDate, toDate);

    return res.status(200).json({
      success: true,
      message: "Profit & Loss statement fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getProfitLossStatement", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch profit & loss statement",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get inventory alerts - low stock, out of stock, overstock
 */
export async function getInventoryAlerts(req, res) {
  try {
    const data = await getInventoryAlertsService();

    return res.status(200).json({
      success: true,
      message: "Inventory alerts fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getInventoryAlerts", {
      error: err.message,
      user: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory alerts",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get stock movement analysis
 */
export async function getStockMovement(req, res) {
  try {
    let { days = 30 } = req.query;

    // Validate days parameter
    days = Math.max(1, Math.min(365, Number(days) || 30));

    const data = await getStockMovementService(days);

    return res.status(200).json({
      success: true,
      message: "Stock movement analysis fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        period_days: days,
      },
    });
  } catch (err) {
    logger.error("getStockMovement", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movement analysis",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get reorder recommendations
 */
export async function getReorderRecommendations(req, res) {
  try {
    let { days = 30 } = req.query;

    // Validate days parameter
    days = Math.max(1, Math.min(365, Number(days) || 30));

    const data = await getReorderRecommendationsService(days);

    return res.status(200).json({
      success: true,
      message: "Reorder recommendations fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        period_days: days,
      },
    });
  } catch (err) {
    logger.error("getReorderRecommendations", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch reorder recommendations",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get inventory valuation
 */
export async function getInventoryValuation(req, res) {
  try {
    const data = await getInventoryValuationService();

    return res.status(200).json({
      success: true,
      message: "Inventory valuation fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
      },
    });
  } catch (err) {
    logger.error("getInventoryValuation", {
      error: err.message,
      user: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory valuation",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get detailed product-level inventory with purchase history
 */
export async function getDetailedInventory(req, res) {
  try {
    let { limit = 50 } = req.query;

    // Validate limit parameter
    limit = Math.max(1, Math.min(500, Number(limit) || 50));

    const data = await getDetailedInventoryService(limit);

    return res.status(200).json({
      success: true,
      message: "Detailed inventory fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        limit,
      },
    });
  } catch (err) {
    logger.error("getDetailedInventory", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch detailed inventory",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

/**
 * Get comprehensive product analysis for dashboard
 * Top/Bottom sellers, profit leaders, category performance
 */
export async function getProductAnalysis(req, res) {
  try {
    let { fromDate, toDate, days = 30 } = req.query;

    // Validate date format if provided
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate format. Use YYYY-MM-DD",
      });
    }
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate format. Use YYYY-MM-DD",
      });
    }

    // Default to last 30 days if not provided
    let start = fromDate?.trim() || null;
    let end = toDate?.trim() || null;

    if (!start || !end) {
      const now = new Date();
      const past = new Date();
      past.setDate(now.getDate() - 30);
      start = past.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    }

    days = Math.max(1, Math.min(365, Number(days) || 30));

    const data = await getProductAnalysisService(start, end, days);

    return res.status(200).json({
      success: true,
      message: "Product analysis fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        period_days: days,
      },
    });
  } catch (err) {
    logger.error("getProductAnalysis", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch product analysis",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

// COMPREHENSIVE FINANCIAL ANALYSIS
export async function getComprehensiveFinancialAnalysis(req, res) {
  try {
    let { fromDate, toDate, days = 30 } = req.query;

    // Validate date format
    if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fromDate format. Use YYYY-MM-DD",
      });
    }
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid toDate format. Use YYYY-MM-DD",
      });
    }

    // Default date range: last 30 days if not provided
    const end = toDate ? new Date(toDate) : new Date();
    let start = fromDate ? new Date(fromDate) : new Date(end);
    if (!fromDate) {
      start.setDate(start.getDate() - (parseInt(days) || 30));
    }

    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    const data = await getComprehensiveFinancialAnalysisService(
      startDate,
      endDate,
      parseInt(days) || 30,
    );

    return res.status(200).json({
      success: true,
      message: "Comprehensive financial analysis fetched successfully",
      data,
      meta: {
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        dateRange: { startDate, endDate },
      },
    });
  } catch (err) {
    logger.error("getComprehensiveFinancialAnalysis", {
      error: err.message,
      user: req.user?.id,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch comprehensive financial analysis",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}
