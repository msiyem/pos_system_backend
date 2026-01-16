import pool from "../config/db.js";
import { createSaleService } from "./sales.service.js";

export const getOrCreateCart = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id FROM carts 
    WHERE user_id=? AND status='active' `,
    [userId]
  );

  let cartId;
  if (rows.length === 0) {
    const [res] = await pool.query(`INSERT INTO carts (user_id) VALUES(?)`, [
      userId,
    ]);
    cartId = res.insertId;
  } else {
    cartId = rows[0].id;
  }

  const [items] = await pool.query(
    `SELECT * FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ?`,
    [cartId]
  );
  return { cartId, items };
};

export const addItem = async (userId, { productId, qty }) => {
  const [[product]] = await pool.query(
    `SELECT price,stock FROM products
    WHERE id=?`,
    [productId]
  );

  if (!product) throw new Error("Invalid product!");

  if (product.stock < qty) throw new Error("Out of stock!");

  const [[cart]] = await pool.query(
    `SELECT id FROM carts
    WHERE user_id = ? AND status='active'`,
    [userId]
  );
  await pool.query(
    `INSERT INTO cart_items (cart_id,product_id,quantity,price) 
    VALUES (?,?,?,?)
    ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
    [cart.id, productId, qty, product.price, qty]
  );
};

export const updatekQuantity = async (userid, { itemId, qty }) => {
  if (qty <= 0) throw new Error("Invalid quantity!");

  await pool.query(
    `UPDATE cart_items ci
    JOIN carts c ON c.id = ci.cart_id
    SET ci.quantity = ?
    WHERE ci.id=? AND c.user_id=? AND c.status='active'`,
    [qty, itemId, userid]
  );
};

export const removeItem = async (userId, itemId) => {
  await pool.query(
    `DELETE ci FROM cart_items ci
    JOIN carts c ON c.id=ci.cart_id
    WHERE ci.id=? AND c.user_id=? AND c.status='active' `,
    [itemId, userId]
  );
};

export const checkout = async (userId,saleData) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[cart]] = await conn.query(
      `SELECT id FROM carts 
      WHERE user_id=? AND status='active' 
      FOR UPDATE`,
      [userId]
    );
    if (!cart) throw new Error("No active cart!");

    const [items] = await conn.query(
      `SELECT 
        ci.product_id,
        ci.quantity,
        ci.price
      FROM cart_items ci
      WHERE cart_id=?`,
      [cart.id]
    );

    if (items.length === 0) throw new Error("Cart Empty!");

    const saleResult = await createSaleService({
      ...saleData,
      user_id: userId,
      items,
      cart_id: cart.id,
    });

    await conn.query(
      `UPDATE carts SET status='checked_out'
      WHERE id=? `,
      [cart.id]
    );
    await conn.commit();
    return saleResult;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.release();
  }
};
