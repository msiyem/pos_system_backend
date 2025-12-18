import {
  createPurchaseService,
  getPurchasesService,
} from "../services/purchases.service.js";

// Create purchase
export async function createPurchase(req, res) {
  try {
    const result = await createPurchaseService(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
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
