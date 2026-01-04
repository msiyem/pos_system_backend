import {
  addSupplierService,
  getSuppliersService,
  getSupplierDetailsService,
  deleteSupplierService,
  updateSupplierService,
} from "../services/suppliers.service.js";

// Add supplier
export async function addSupplier(req, res) {
  let image_url = req.file?.path || null;
  let image_public_id = req.file?.filename || null;

  try {
    const supplierId = await addSupplierService(
      req.body,
      image_url,
      image_public_id
    );
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
      message: "Supplier fetched Successfully",
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

//Update supplier
export async function updateSupplier(req, res) {
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
    await updateSupplierService(
      req.params.id,
      req.body,
      image_url,
      image_public_id
    );
    res.json({
      success: true,
      message: `Supplier update successfully,Id=${req.params.id}`,
    });
  } catch (err) {
    console.error(err);
    if (err.message === "Supplier not found!")
      return res.status(404).json({ success: false, message: err.message });
    res
      .status(500)
      .json({
        success: false,
        message: "Supplier update failed!",
        error: err.message,
      });
  }
}

// Delete supplier
export async function deleteSupplier(req, res) {
  try {
    await deleteSupplierService(req.params.id);
    res.json({ message: "Deleted Supplier successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed deleted!" });
  }
}
