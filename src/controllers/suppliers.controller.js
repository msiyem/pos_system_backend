import {
  addSupplierService,
  getSuppliersService,
  getSupplierDetailsService,
  deleteSupplierService,
} from "../services/suppliers.service.js";

// Add supplier
export async function addSupplier(req, res) {
  try {
    const supplierId = await addSupplierService(req.body);
    res.status(201).json({
      success: true,
      message: `Supplier added Successfull! ID = ${supplierId}`,
      supplierId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed!" });
  }
}

// Get all suppliers
export async function getSuppliers(req, res) {
  try {
    const result = await getSuppliersService(req.query);
    res.json({
      success: true,
      message: "Fetched Successfully",
      ...result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
}

// Get supplier details
export async function getSupplierDetails(req, res) {
  try {
    const rows = await getSupplierDetailsService(req.params.id);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json({
      success: true,
      message: "Fetched Successfully",
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// Delete supplier
export async function deleteSupplier(req, res) {
  try {
    await deleteSupplierService(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
}
