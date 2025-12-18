import {
  getInventoryLogsService,
  addInventoryLogService,
  deleteInventoryLogService,
} from "../services/inventory.service.js";

// Get inventory logs
export async function getInventoryLogs(req, res) {
  try {
    const rows = await getInventoryLogsService();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching inventory logs:", err);
    res.status(500).json({ error: "Failed to fetch inventory logs" });
  }
}

// Add inventory log
export async function addInventoryLog(req, res) {
  try {
    await addInventoryLogService(req.body);
    res.json({ message: "Inventory log added successfully" });
  } catch (err) {
    console.error("Error adding inventory log:", err);

    if (err.message === "Missing required fields") {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: "Failed to add inventory log" });
  }
}

// Delete inventory log
export async function deleteInventoryLog(req, res) {
  try {
    await deleteInventoryLogService(req.params.id);
    res.json({ message: "Inventory log deleted successfully" });
  } catch (err) {
    console.error("Error deleting inventory log:", err);
    res.status(500).json({ error: "Failed to delete inventory log" });
  }
}
