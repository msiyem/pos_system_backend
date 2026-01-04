import {
  getCustomersService,
  getCustomerDetailsService,
  addCustomerService,
  updateCustomerService,
  deleteCustomerService,
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
    res
      .status(201)
      .json({
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

  if(req.body.removeImage === 'true'){
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
