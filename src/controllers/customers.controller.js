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
    if (!rows.length) return res.status(404).json({ message: "Customer not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// Add new customer
export async function addCustomer(req, res) {
  try {
    const customerId = await addCustomerService(req.body);
    res.status(201).json({ message: "Customer created successsfully", id: customerId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Update customer
export async function updateCustomer(req, res) {
  try {
    await updateCustomerService(req.params.id, req.body);
    res.json({ success: true, message: "Customer updated successfully" });
  } catch (err) {
    console.error(err);
    if (err.message === "Customer not found") return res.status(404).json({ success: false, message: err.message });
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
    if (err.message === "Customer not found") return res.status(404).json({ message: err.message });
    res.status(500).json({ error: err.message });
  }
}
