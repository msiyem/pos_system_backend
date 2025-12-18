// controllers/tax.controller.js
import {
  getAllTaxRates,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate
} from "../services/tax.service.js";

export async function getTaxes(req, res) {
  try {
    const rows = await getAllTaxRates();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching tax rates:", err);
    res.status(500).json({ error: "Failed to fetch tax rates" });
  }
}

export async function addTax(req, res) {
  try {
    const { name, rate } = req.body;

    if (!name || rate == null) {
      return res.status(400).json({ error: "Name and rate are required" });
    }

    await createTaxRate(name, rate);
    res.json({ message: "Tax rate added successfully" });
  } catch (err) {
    console.error("Error adding tax rate:", err);
    res.status(500).json({ error: "Failed to add tax rate" });
  }
}

export async function editTax(req, res) {
  try {
    const { id } = req.params;
    const { name, rate } = req.body;

    await updateTaxRate(id, name, rate);
    res.json({ message: "Tax rate updated successfully" });
  } catch (err) {
    console.error("Error updating tax rate:", err);
    res.status(500).json({ error: "Failed to update tax rate" });
  }
}

export async function removeTax(req, res) {
  try {
    const { id } = req.params;
    await deleteTaxRate(id);
    res.json({ message: "Tax rate deleted successfully" });
  } catch (err) {
    console.error("Error deleting tax rate:", err);
    res.status(500).json({ error: "Failed to delete tax rate" });
  }
}
