import * as cartService from "../services/cart.service";

export const getCart = async (req, res) => {
  try {
    const cart = cartService.getOrCreateCart(req.user.id);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    await cartService.addItemToCart(req.user.id, req.body);
    res.json({ message: "Item added to cart" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateQty = async (req, res) => {
  try {
    await cartService.updatekQuantity(req.user.id, req.body);
    res.json({ message: "Quantity updated" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const removeItem = async (req, res) => {
  try {
    await cartService.removeItem(req.user.id, req.params.itemId);
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const checkout = async (req, res) => {
  try {
    const invoice = await cartService.checkout(req.user.id);
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
