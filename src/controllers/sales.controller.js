import {
  createSaleService,
  getSalesService,
} from "../services/sales.service.js";

export async function createSale(req, res) {
  try {
    const result = await createSaleService(req.body);
    res.json(result);
  } catch (err) {
    console.error("Sale error:", err);
    res.status(400).json({ error: err.message || "Sale failed" });
  }
}

export async function getSales(req, res) {
  try {
    const rows = await getSalesService();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sales" });
  }
}
