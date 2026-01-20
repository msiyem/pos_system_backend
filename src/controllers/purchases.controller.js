import {
  createPurchaseService,
  getPurchasesService,
  getSupplierOverallSummaryService,
  getSupplierPurchaseItemsService,
  getSupplierSupliesProductsService,
  getSupplierSupliesSpecificProductService,
  getSupplierTransactionCount,
  getSupplierTransactionHistoryService,
} from "../services/purchases.service.js";

// Create purchase
export async function createPurchase(req, res) {
  try {
    const user_id = req.user.id;

    const result = await createPurchaseService(user_id,req.body);
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.purchase,
    });
  } catch (err) {
    console.error("Create Purchase Error: ",err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Purchase failed",
    });
  }
}

export const getSupplierSuppliesProductsController = async (req, res) => {
  const { supplier_id } = req.params;
  const { fromDate, toDate, page = 1, limit = 10 } = req.query;

  try {
    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "supplier_id are required",
      });
    }
    const rows = await getSupplierSupliesProductsService(
      supplier_id,
      fromDate,
      toDate,
      Number(page),
      Number(limit),
    );
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Supplies products error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase products",
      error: err.message,
    });
  }
};

export const getSupplierOverallSummaryController = async (req, res) => {
  const { supplier_id } = req.params;
  const { fromDate, toDate } = req.query;

  if (!supplier_id) {
    return res.status(400).json({
      success: false,
      message: "supplier_id is required",
    });
  }

  try {
    const summary = await getSupplierOverallSummaryService(
      supplier_id,
      fromDate,
      toDate
    );

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch supplier summary",
    });
  }
};

export const getSupplierSupliesSpecificProductController =async(req,res)=>{
  try {
    const {
      fromDate='',
      toDate='',
      page=1,
      limit=10,
    }=req.query;
    const {supplier_id,product_id} = req.params;
    
    if(!supplier_id || !product_id){
      return res.status(400).json({
        success:false,
        message: "supplier_id and product_id is required",
      });
    }
    const data = await getSupplierSupliesSpecificProductService(
      null,
      supplier_id,
      product_id,
      fromDate,
      toDate,
      Number(page),
      Number(limit),
    );
    res.status(200).json({
      success:true,
      page: Number(page),
      limit: Number(limit),
      data: data,
    })
  } catch (err) {
    console.error("getSupplierSupliesSpecificProductController error:",err);
    return res.status(500).json({
      success:false,
      message:"Failed to fetch supplied products",
    });
    
  }
}

export async function getSupplierTransaction(req, res) {
  const { id } = req.params;
  const { fromDate, toDate, type, page = 1, limit = 10 } = req.query;

  try {
    if (!id) {
      return res.status(400).json({ message: "Supplier ID is required" });
    }

    const data = await getSupplierTransactionHistoryService({
      supplier_id: Number(id),
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
      error: "Failed to fetch supplier transactions",
    });
  }
}

export async function getSupplierTransactionSummary(req, res) {
  const { id } = req.params;
  const { fromDate, toDate, type, limit = 10 } = req.query;

  try {
    if (!id) {
      return res.status(400).json({ message: "Supplier ID is required" });
    }

    const summary = await getSupplierTransactionCount({
      supplierId: Number(id),
      fromDate,
      toDate,
      type: type && type !== "All" ? type : undefined,
    });

    const total = Number(summary?.total_transactions || 0);

    return res.status(200).json({
      success: true,

      total_transactions: summary?.total_transactions || 0,
      purchase_count: summary?.purchase_count || 0,
      payment_count: summary?.payment_count || 0,
      duepayment_count: summary?.duepayment_count || 0,
      advance_count: summary?.advance_count || 0,

      pagination: {
        totalPage: Math.ceil(total / Number(limit)),
        total,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
      error: "Failed to fetch supplier transaction summary",
    });
  }
}



export async function getSupplierPurchaseItemsController(req, res) {
  const { supplierId, purchaseId } = req.params;
  const userId = req.user.id;

  try {
    if (!purchaseId || !supplierId) {
      return res.status(400).json({
        success: false,
        message: "purchaseId and supplierId are required",
      });
    }

    const items = await getSupplierPurchaseItemsService(
      purchaseId,
      supplierId,
      userId
    );

    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("getSupplierPurchaseItemsController error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase items",
    });
  }
}



// Get purchase list
export async function getPurchases(req, res) {
  try {
    const rows = await getPurchasesService();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
}
