import {
  getDueService,
  getSupplierDueService,
  handleDuePaymentService,
  handleSupplierDuePaymentService,
} from "../services/duepayment.service.js";

export async function duePaymentController(req, res) {
  try {
    const { amount, method } = req.body;
    const { customer_id } = req.params;
    const user_id = req.user.id;
    const result = await handleDuePaymentService(
      customer_id,
      amount,
      method,
      user_id,
    );
    res.status(200).json({
      success: true,
      message: "Due payment processed successfully",
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function getDueDetailsController(req, res) {
  try {
    const { customer_id } = req.params;

    if (!customer_id || isNaN(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer id",
      });
    }
    const dues = await getDueService(customer_id);

    if (!dues.total === 0) {
      return res.status(200).json({
        success: true,
        message: "No due found",
        total: 0,
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      total: dues.total,
      data: dues.data,
    });
  } catch (err) {
    console.error("getDueDetailsController error: ", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function supplierDuePaymentController(req, res) {
  try {
    const { amount, method } = req.body;
    const { supplier_id } = req.params;
    const user_id = req.user.id;

    if (!supplier_id || isNaN(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier id",
      });
    }

    const result = await handleSupplierDuePaymentService(
      supplier_id,
      amount,
      method,
      user_id
    );

    res.status(200).json({
      success: true,
      message: "Supplier due payment processed successfully",
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

export async function getSupplierDueDetailsController(req, res) {
  try {
    const { supplier_id } = req.params;

    if (!supplier_id || isNaN(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier id",
      });
    }

    const dues = await getSupplierDueService(supplier_id);

    if (dues.total === 0) {
      return res.status(200).json({
        success: true,
        message: "No due found",
        total: 0,
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      total: dues.total,
      data: dues.data,
    });
  } catch (err) {
    console.error("getSupplierDueDetailsController error: ", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
