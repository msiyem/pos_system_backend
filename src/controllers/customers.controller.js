import {
  getCustomersService,
  getCustomerDetailsService,
  addCustomerService,
  updateCustomerService,
  deleteCustomerService,
  getCustomerTransactionHistoryService,
  getCustomerTransactionCount,
  getCustomerSalesItemsService,
} from "../services/customers.service.js";

// Get all customers
export async function getCustomers(req, res) {
  try {
    const result = await getCustomersService(req.query);
    res.json({ success: true, message: "Fetched successfully", ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Get customer details
export async function getCustomerDetails(req, res) {
  try {
    const rows = await getCustomerDetailsService(req.params.id);
    if (!rows.length)
      return res.status(404).json({ message: "Customer not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

//Get customer transaction history
export async function getCustomerTransaction(req, res) {
  const { id } = req.params;
  const { fromDate, toDate, type, page = 1, limit = 10 } = req.query;

  try {
    if (!id) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    const data = await getCustomerTransactionHistoryService({
      customerId: Number(id),
      fromDate,
      toDate,
      type: type && type !== "All" ? type : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      error: "Failed to fetch customer transactions",
    });
  }
}

export async function getCustomerTransactionSummary(req, res) {
  const { id } = req.params;
  const { fromDate, toDate, type, limit = 10 } = req.query;

  try {
    if (!id) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    const summary = await getCustomerTransactionCount({
      customerId: Number(id),
      fromDate,
      toDate,
      type: type && type !== "All" ? type : undefined,
    });

    const total = Number(summary?.total_transactions || 0);

    return res.status(200).json({
      success: true,

      total_transactions: summary?.total_transactions || 0,
      purchased_count: summary?.purchased_count || 0,
      payment_count: summary?.payment_count || 0,
      duepayment_count: summary?.duepayment_count || 0,
      refund_count: summary?.refund_count || 0,

      pagination: {
        totalPage: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      error: "Failed to fetch customer transaction summary",
    });
  }
}


export async function getCustomerSalesItemsController(req, res) {
  const { customerId, saleId } = req.params;
  const userId = req.user.id;
  try {
    if (!saleId || !customerId) {
      return res.status(400).json({
        success: false,
        message: "saleId and customerId are required",
      });
    }

    const items = await getCustomerSalesItemsService(
      saleId,
      customerId,
      userId
    );

    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("getCustomerSalesItemsController error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sale items",
    });
  }
}

// Add new customer
export async function addCustomer(req, res) {
  try {
    let image_url = null;
    let image_public_id = null;
    if (req.file) {
      image_url = req.file?.path;
      image_public_id = req.file?.filename;
    }
    const customerId = await addCustomerService(
      req.body,
      image_url,
      image_public_id
    );
    res.status(201).json({
      success: true,
      message: `Customer added successsfully!,Id=${customerId}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, message: err.message });
  }
}

// Update customer
export async function updateCustomer(req, res) {
  let image_url = null;
  let image_public_id = null;

  if (req.file) {
    image_url = req.file.path;
    image_public_id = req.file.filename;
  }

  if (req.body.removeImage === "true") {
    image_url = null;
    image_public_id = null;
  }
  try {
    await updateCustomerService(
      req.params.id,
      req.body,
      image_url,
      image_public_id
    );
    res.json({
      success: true,
      message: `Customer update successfully,Id=${req.params.id}`,
    });
  } catch (err) {
    console.error(err);
    if (err.message === "Customer not found")
      return res.status(404).json({ success: false, message: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
}

// Delete customer
export async function deleteCustomer(req, res) {
  try {
    await deleteCustomerService(req.params.id);
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error(err);
    if (err.message === "Customer not found")
      return res.status(404).json({ message: err.message });
    res.status(500).json({ error: err.message });
  }
}
