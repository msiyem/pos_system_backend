import {
  getProductsService,
  addProductService,
  updateProductService,
  deleteProductService,
} from "../services/products.service.js";

// Get products
export async function getProducts(req, res) {
  try {
    const result = await getProductsService(req.query);
    res.json({
      success: true,
      message: "Fetched successfully",
      data: result.rows,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (err) {
    console.error("Error in GET /products:", err);
    res.status(500).json({ error: err.message });
  }
}

// Add product
export async function addProduct(req, res) {
  try {
    const { name, description, sku, brand_id, category_id, stock = 0 } = req.body;
    const image_url = req.file ? req.file.path : null;
    const price = parseFloat(req.body.price);

    if (!name || !sku || isNaN(price)) {
      return res.status(400).json({ error: "Name, SKU, and valid Price required" });
    }

    const id = await addProductService({ name, description, sku, price, brand_id, category_id, image_url, stock });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: { id, name, image_url },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" });
  }
}

// Update product
export async function updateProduct(req, res) {
  try {
    const { name, description, sku, price, brand_id, category_id } = req.body;
    const image_url = req.file ? req.file.path : req.body.image_url;

    const affectedRows = await updateProductService(req.params.id, { name, description, sku, price, brand_id, category_id, image_url });

    if (!affectedRows) return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
}

// Delete product
export async function deleteProduct(req, res) {
  try {
    const affectedRows = await deleteProductService(req.params.id);

    if (!affectedRows) return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
}
