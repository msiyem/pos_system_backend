import {
  getBrandsService,
  addBrandService,
  updateBrandService,
  deleteBrandService,
} from "../services/brands.service.js";

// Get all brands
export async function getBrands(req, res) {
  try {
    const rows = await getBrandsService();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching brands:", err);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
}

// Add brand
export async function addBrand(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Brand name is required" });

    const id = await addBrandService(name, description);
    res.json({ message: `Brand added successfully,Id=${id}`});
  } catch (err) {
    console.error("Error adding brand:", err);
    res.status(500).json({ error: "Failed to add brand" });
  }
}

// Update brand
export async function updateBrand(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    await updateBrandService(id, name, description);
    res.json({ message: "Brand updated successfully" });
  } catch (err) {
    console.error("Error updating brand:", err);
    res.status(500).json({ error: "Failed to update brand" });
  }
}

// Delete brand
export async function deleteBrand(req, res) {
  try {
    const { id } = req.params;
    await deleteBrandService(id);
    res.json({ message: "Brand deleted successfully" });
  } catch (err) {
    console.error("Error deleting brand:", err);
    res.status(500).json({ error: "Failed to delete brand" });
  }
}
