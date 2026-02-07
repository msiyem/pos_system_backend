import { cloudinary } from "../config/cloudinary.js";
import {
  getProductsService,
  getProductByIdService,
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

// Get product by id
export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await getProductByIdService(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Fetched successfully",
      data: product,
    });
  } catch (err) {
    console.error("Error in GET /products/:id:", err);
    res.status(500).json({ error: err.message });
  }
}

// Add product
export async function addProduct(req, res) {
  try {
    const {
      name,
      description,
      sku,
      brand_id,
      category_id,
      stock = 0,
    } = req.body;
    // const image_url = req.file ? req.file.path : null;
    const price = parseFloat(req.body.price);
    let image_url = null;
    let image_public_id = null;

    if (req.file) {
      image_url = req.file.path;
      image_public_id = req.file.filename;
    }

    if (!name) {
      return res.status(400).json({ error: "Name is required!" });
    }
    if (!sku) return res.status(400).json({ error: "SKU is required!" });
    if (!isNaN)
      return res.status(400).json({ error: "Valid Price is required!" });
    if (!brand_id) return res.status(400).json({ error: "Brand is required!" });
    if (!category_id)
      return res.status(400).json({ error: "Category is required!" });

    const id = await addProductService({
      name,
      description,
      sku,
      price,
      brand_id,
      category_id,
      image_url,
      image_public_id,
      stock,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: { id, name, image_url },
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create product", message: err.message });
  }
}

// Update product
export async function updateProduct(req, res) {
  try {
    
    const { id } = req.params;
    const oldProduct = await getProductByIdService(id);
    if (!oldProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }
    let image_url = oldProduct.image_url;
    let image_public_id = oldProduct.image_public_id;

    if (req.file) {
      // if(image_public_id){
      //   await cloudinary.uploader.destroy(image_public_id);
      // }
      image_url = req.file?.path;
      image_public_id = req.file?.filename;
    }
    if (req.body.removeImage === "true") {
      image_url = null;
      image_public_id = null;
    }

    await updateProductService(id, req.body, image_url, image_public_id);

    res.json({ message: "Product updated successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update product", message: err.message });
  }
}

// Delete product
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await getProductByIdService(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found!" });
    }
    if (product.image_public_id) {
      await cloudinary.uploader.destroy(product.image_public_id);
    }
    const affectedRows = await deleteProductService(id);

    if (!affectedRows)
      return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete product", message: err.message });
  }
}
