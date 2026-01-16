import {
  getSalesService,
  createSaleService,
  completePendingSaleService,
  getCustomerPurchasedProductsService,
  getCustomerSaleProductsService,
} from "../services/sales.service.js";
import * as cartService from "../services/cart.service.js";

export async function checkoutSale(req, res) {
  try {
    const result = await createSaleService(req.user.id, req.body, "completed");
    res.json(result);
  } catch (err) {
    console.error("Sale error:", err);
    res.status(400).json({ error: err.message || "Sale failed" });
  }
}

export async function savePendingSale(req, res) {
  try {
    const result = await createSaleService(req.user.id, req.body, "pending");
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
export async function completePending(req, res) {
  const { sale_id, paid_amount = 0, payment_method = "cash" } = req.body;
  try {
    const result = await completePendingSaleService(
      sale_id,
      req.user.id,
      paid_amount,
      payment_method
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export const getAllPendingSales = async (req, res) => {
  try {
    const rows = await getSalesService("pending");
    res.json(rows);
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message, error: "Failed to fetch pending sales" });
  }
};

export async function getAllSales(req, res) {
  try {
    const rows = await getSalesService("completed");
    res.json(rows);
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message, error: "Failed to fetch sales" });
  }
}

export const getCutomerPurchasedProducts = async (req, res) => {
  const { customerId } = req.params;
  const { fromDate, toDate, page = 1, limit = 10 } = req.query;

  try {
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "customerId are required",
      });
    }
    const rows = await getCustomerPurchasedProductsService({
      customerId,
      fromDate,
      toDate,
      page: Number(page),
      limit: Number(limit),
    });
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Purchased products error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sale products",
      error: err.message,
    });
  }
};

export const getCustomerSaleProducts = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;
    const {customer_id,product_id}=req.params;
    const user_id = req.user?.id;

    if (!customer_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id and product_id is required!",
      });
    }

    const data = await getCustomerSaleProductsService(
      user_id,
      customer_id,
      product_id,
      fromDate,
      toDate,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      cout: data.length,
      data: data,
    });
  } catch (err) {
    console.error("getCustomerSaleProductsController error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sale products",
    });
  }
};

export const payDue = async (req, res) => {
  try {
    const result = await dueService.payDueService(req.body);
    // req.body: { due_id, paid_amount }
    res.json(result);
  } catch (err) {
    console.error("Pay due error:", err);
    res.status(400).json({ message: err.message });
  }
};

export const getCustomerDues = async (req, res) => {
  try {
    const [rows] = await dueService.getCustomerDues(req.params.customerId);
    res.json(rows);
  } catch (err) {
    console.error("Get dues error:", err);
    res.status(500).json({ message: err.message });
  }
};
