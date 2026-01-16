import express from "express";
import { addToCart, getCart, removeItem, updateQty } from "../controllers/cart.cotroller";
import { checkoutCart} from "../controllers/sales.controller";

const router = express.Router();
router.get("/cart",getCart);
router.post("/cart/add",addToCart);
router.put("/cart/item",updateQty);
router.delete("/cart/item/:itemId",removeItem);
router.post("/cart/checkout",checkoutCart);

export default router;