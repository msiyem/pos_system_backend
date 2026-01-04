import {
  getCategoriesService,
  addCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from "../services/categories.service.js";

// Get all categories
export async function getCategories(req, res) {
  try {
    const rows = await getCategoriesService();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
}

// Add category
export async function addCategory(req, res) {
  try {
    const { name,is_active} = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required" });

    const id=await addCategoryService(name,is_active);
    res.json({ message: `Category added successfully,Id=${id}` });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ error: "Failed to add category" });
  }
}

// Update category
export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await updateCategoryService(id, name);
    res.json({ message: "Category updated successfully" });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
}

// Delete category
export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    await deleteCategoryService(id);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
}
