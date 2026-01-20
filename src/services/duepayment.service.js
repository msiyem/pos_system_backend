import pool from "../config/db.js";

export async function handleDuePaymentService(customer_id, amount, method, user_id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let remaining = amount;
    let totalApplied = 0;

    const [dues] = await conn.query(
      `
      SELECT 
        cd.id,
        cd.sale_id,
        cd.due_amount,
        s.invoice_no invoice
      FROM 
        customer_dues cd
      JOIN sales s ON s.id = cd.sale_id
      WHERE 
        cd.customer_id = ?
      AND cd.status = 'open'
      ORDER BY 
        cd.created_at 
      ASC
      FOR UPDATE
      `,
      [customer_id]
    );

    if (!dues.length) {
      throw new Error("No open dues found for this customer");
    }

    for (const due of dues) {
      if (remaining <= 0) break;

      const payAmount = Math.min(remaining, due.due_amount);
      const newDue = due.due_amount - payAmount;

      await conn.query(
        `
        INSERT INTO 
          payments
        (
          customer_id,
          sale_id,
          amount,
          payment_type,
          direction,
          method,
          user_id,
          reference_no,
          note
        )
        VALUES (?,?,?, 'due_payment','in',?,?,?,?)
        `,
        [
          customer_id,
          due.sale_id,
          payAmount,
          method,
          user_id,
          due.invoice,
          `Due payment applied to sale #${due.sale_id}`,
        ]
      );

      await conn.query(
        `
          UPDATE customer_dues
          SET 
            due_amount = ?, 
            status = ?
          WHERE id = ?
        `,
        [newDue, newDue === 0 ? "paid" : "open", due.id]
      );

      await conn.query(
        `
          UPDATE sales
          SET 
            paid_amount = paid_amount + ?,
            due_amount = due_amount - ?
          WHERE id = ?
        `,
        [payAmount, payAmount, due.sale_id]
      );

      remaining -= payAmount;
      totalApplied += payAmount;
    }

    await conn.query(
      `
      UPDATE 
        customers
      SET 
        debt = debt - ?
      WHERE id = ?
      `,
      [totalApplied, customer_id]
    );

    if (remaining > 0) {
      await conn.query(
        `
        INSERT INTO payments
        (
          customer_id,
          amount,
          payment_type,
          direction,
          method,
          user_id,
          note
        )
        VALUES(?,?,'advance','in',?,?,?)
        `,
        [
          customer_id,
          remaining,
          method,
          user_id,
          "Extra amount stored as advance",
        ]
      );
    }
    await conn.commit();
    return {
      success: true,
      applied_amount: totalApplied,
      advance_amount: remaining,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getDueService(customer_id) {
  const [rows] = await pool.query(
    `
    SELECT
      cd.id,
      cd.sale_id,
      cd.due_amount,
      
      DATE_FORMAT(
        CONVERT_TZ(cd.created_at,'+00:00','+00:00'),
        '%d-%m-%Y %I:%i %p'
      ) AS created_at,

      s.invoice_no AS invoice,
      u.name AS seller,
      s.payment_method AS method,
      s.total_amount,
      s.paid_amount,

      c.debt AS total_due,
      c.name
    FROM customer_dues cd
    JOIN sales s ON s.id = cd.sale_id
    JOIN customers c ON c.id = cd.customer_id
    JOIN users u ON u.id = s.user_id
    WHERE cd.customer_id = ?
      AND cd.status = 'open'
    ORDER BY cd.created_at ASC
    `,
    [customer_id]
  );

  const [[countRow]] = await pool.query(
  `
  SELECT COUNT(*) AS total
  FROM customer_dues
  WHERE customer_id = ?
    AND status = 'open'
  `,
  [customer_id]
);


  return {
    total : countRow.total,
    data: rows,

  }
}

export async function getSupplierDueService(supplier_id) {
  const [rows] = await pool.query(
    `
    SELECT
      p.id AS purchase_id,
      p.due_amount,
      
      DATE_FORMAT(
        CONVERT_TZ(p.created_at,'+00:00','+00:00'),
        '%d-%m-%Y %I:%i %p'
      ) AS created_at,

      p.invoice_no AS invoice,
      u.name AS buyer,
      p.payment_method AS method,
      p.total_amount,
      p.paid_amount,

      s.payable AS total_due,
      s.name AS supplier
    FROM purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN users u ON u.id = p.user_id
    WHERE p.supplier_id = ?
      AND p.due_amount > 0
    ORDER BY p.created_at ASC
    `,
    [supplier_id]
  );

  const [[countRow]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM purchases
    WHERE supplier_id = ?
      AND due_amount > 0
    `,
    [supplier_id]
  );

  return {
    total: countRow.total,
    data: rows,
  };
}

export async function handleSupplierDuePaymentService(
  supplier_id,
  amount,
  method,
  user_id
) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    let remaining = amount;
    let totalApplied = 0;

    const [dues] = await conn.query(
      `
      SELECT 
        p.id,
        p.due_amount,
        p.invoice_no AS invoice
      FROM purchases p
      WHERE p.supplier_id = ?
        AND p.due_amount > 0
      ORDER BY p.created_at ASC
      FOR UPDATE
      `,
      [supplier_id]
    );

    if (!dues.length) {
      throw new Error("No open dues found for this supplier");
    }

    for (const due of dues) {
      if (remaining <= 0) break;

      const payAmount = Math.min(remaining, due.due_amount);
      const newDue = due.due_amount - payAmount;

      // INSERT PAYMENT (supplier)
      await conn.query(
        `
        INSERT INTO payments
        (
          supplier_id,
          purchase_id,
          amount,
          payment_type,
          payment_party,
          direction,
          method,
          user_id,
          reference_no,
          note
        )
        VALUES (?,?,?,'due_payment','supplier','out',?,?,?,?)
        `,
        [
          supplier_id,
          due.id,
          payAmount,
          method,
          user_id,
          due.invoice,
          `Due payment applied to purchase #${due.id}`,
        ]
      );

      // UPDATE PURCHASE
      await conn.query(
        `
        UPDATE purchases
        SET 
          paid_amount = paid_amount + ?,
          due_amount = due_amount - ?
        WHERE id = ?
        `,
        [payAmount, payAmount, due.id]
      );

      remaining -= payAmount;
      totalApplied += payAmount;
    }

    // UPDATE SUPPLIER PAYABLE
    await conn.query(
      `
      UPDATE suppliers
      SET payable = payable - ?
      WHERE id = ?
      `,
      [totalApplied, supplier_id]
    );

    // EXTRA → ADVANCE PAYMENT
    if (remaining > 0) {
      await conn.query(
        `
        INSERT INTO payments
        (
          supplier_id,
          amount,
          payment_type,
          payment_party,
          direction,
          method,
          user_id,
          note
        )
        VALUES (?,?, 'advance','supplier','out',?,?,?)
        `,
        [
          supplier_id,
          remaining,
          method,
          user_id,
          "Extra amount stored as advance",
        ]
      );
    }

    await conn.commit();

    return {
      success: true,
      applied_amount: totalApplied,
      advance_amount: remaining,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

