import pool from "../config/db.js";

// Add Purchase & Items
export async function createPurchaseService(data) {
  const { supplier_id, items, total_amount } = data;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // purchase row
    const [p] = await conn.query(
      "INSERT INTO purchases (supplier_id, total_amount) VALUES (?,?)",
      [supplier_id, total_amount || 0]
    );

    const purchase_id = p.insertId;
    const invoice_no = `INV-P${purchase_id}`;

    await conn.query(
      "UPDATE purchases SET invoice_no = ? WHERE id = ?",
      [invoice_no, purchase_id]
    );

    let total = 0;

    for (let item of items) {
      const { product_id, quantity, price, name, sku, image_url } = item;
      const subtotal = quantity * price;
      total += subtotal;

      // insert purchase item
      await conn.query(
        "INSERT INTO purchase_items (purchase_id, product_id, quantity, price) VALUES (?,?,?,?)",
        [purchase_id, product_id, quantity, price]
      );

      // update stock
      await conn.query(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        [quantity, product_id]
      );

      await conn.query(
        `UPDATE suppliers
         SET last_transition = NOW()
         WHERE id = ?`,
        [supplier_id]
      );

      // inventory log
      await conn.query(
        "INSERT INTO inventory_log (product_id, change_qty, reason, reference) VALUES (?,?,?,?)",
        [product_id, quantity, "PURCHASE", invoice_no]
      );
    }

    await conn.query(
      "UPDATE purchases SET total_amount=? WHERE id=?",
      [total, purchase_id]
    );

    await conn.commit();
    return { message: "Purchase completed", purchase_id };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Get purchase list
export async function getPurchasesService() {
  const [rows] = await pool.query(`
    SELECT p.*, s.name AS supplier
    FROM purchases p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.id DESC
  `);

  return rows;
}
