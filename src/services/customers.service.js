import { cloudinary } from "../config/cloudinary.js";
import pool from "../config/db.js";

// Get all customers (pagination + search)
export async function getCustomersService(query) {
  let { page, limit, search } = query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 9;
  const offset = (page - 1) * limit;
  let sql = `
    SELECT 
      c.*,
      DATE_FORMAT(c.birthday, '%d-%m-%Y') AS birthday,
      DATE_FORMAT(CONVERT_TZ(c.join_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS join_at,
      DATE_FORMAT(CONVERT_TZ(c.last_purchased,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS last_purchased
    FROM customers c
  `;

  let countsql = `SELECT COUNT(*) as total FROM customers c`;
  const params = [];

  if (search) {
    sql += ` WHERE c.name LIKE ?`;
    countsql += ` WHERE c.name LIKE ?`;
    params.push(`%${search}%`);
  }

  sql += ` ORDER BY c.id LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  const [countRows] = await pool.query(countsql, search ? [`%${search}%`] : []);

  return {
    data: rows,
    total: countRows[0].total,
    page,
    limit,
  };
}

// Get customer details
export async function getCustomerDetailsService(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      c.*,
      DATE_FORMAT(c.birthday, '%Y-%m-%d') AS birthday,
      DATE_FORMAT(CONVERT_TZ(c.join_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS join_at,
      DATE_FORMAT(CONVERT_TZ(c.last_purchased,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS last_purchased
    FROM customers c
    WHERE c.id = ?
    `,
    [id]
  );
  return rows;
}

// Add new customer
export async function addCustomerService(data, image_url, image_public_id) {
  const {
    name,
    gender,
    birthday,
    debt,
    total_orders,
    status,
    notes,
    division,
    district,
    city,
    area,
    post_code,
    sector,
    road,
    house,
    phone,
    alt_phone,
    whatsapp,
    email,
    verify,
  } = data;

  const [rows] = await pool.query(
    `INSERT INTO customers (
      name, gender, birthday, debt, total_orders, status, notes,
      division, district, city, area, post_code, sector, road, house,
      phone, alt_phone, whatsapp, email, verify, image_url, image_public_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)`,
    [
      name,
      gender || "male",
      birthday || null,
      debt || 0,
      total_orders || 0,
      status || "active",
      notes || null,
      division,
      district,
      city,
      area,
      post_code,
      sector,
      road,
      house,
      phone,
      alt_phone,
      whatsapp,
      email,
      verify || 0,
      image_url,
      image_public_id,
    ]
  );

  return rows.insertId;
}

// Update customer
export async function updateCustomerService(
  id,
  data,
  image_url,
  image_public_id
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existingCustomer] = await conn.query(
      "SELECT * FROM customers WHERE id=?",
      [id]
    );
    if (!existingCustomer.length) {
      await conn.rollback();
      throw new Error("Customer not found");
    }
    const oldCust = existingCustomer[0];
    const removeImage = data.removeImage === "true";

    if (
      (image_public_id && oldCust.image_public_id) ||
      (removeImage && oldCust.image_public_id)
    ) {
      await cloudinary.uploader.destroy(oldCust.image_public_id);
    }

    const {
      name,
      gender,
      birthday,
      debt,
      total_orders,
      status,
      notes,
      division,
      district,
      city,
      area,
      post_code,
      sector,
      road,
      house,
      phone,
      alt_phone,
      whatsapp,
      email,
      verify,
    } = data;

    const updatedCustomer = {
      name: name ?? oldCust.name,
      gender: gender ?? oldCust.gender,
      birthday: birthday ?? oldCust.birthday,
      debt: debt ?? oldCust.debt,
      total_orders: total_orders ?? oldCust.total_orders,
      status: status ?? oldCust.status,
      notes: notes ?? oldCust.notes,
      division: division ?? oldCust.division ?? null,
      district: district ?? oldCust.district ?? null,
      city: city ?? oldCust.city ?? null,
      area: area ?? oldCust.area ?? null,
      post_code: post_code ?? oldCust.post_code ?? null,
      sector: sector ?? oldCust.sector ?? null,
      road: road ?? oldCust.road ?? null,
      house: house ?? oldCust.house ?? null,
      phone: phone ?? oldCust.phone ?? null,
      alt_phone: alt_phone ?? oldCust.alt_phone ?? null,
      whatsapp: whatsapp ?? oldCust.whatsapp ?? null,
      email: email ?? oldCust.email ?? null,
      verify:
        verify !== undefined && verify !== null && verify !== ""
          ? Number(verify)
          : Number(oldCust.verify ?? 0),

      image_url: removeImage ? null : image_url ?? oldCust.image_url,

      image_public_id: removeImage
        ? null
        : image_public_id ?? oldCust.image_public_id,
    };

    await conn.query(
      `UPDATE customers 
      SET name=?, 
      gender=?, birthday=?, debt=?, total_orders=?, status=?, notes=?, 
      division=?, district=?, city=?, area=?, post_code=?, sector=?, road=?, house=?,
      phone=?, alt_phone=?, whatsapp=?, email=?, verify=?,image_url=?,image_public_id=?
      WHERE id=?`,
      [
        updatedCustomer.name,
        updatedCustomer.gender,
        updatedCustomer.birthday,
        updatedCustomer.debt,
        updatedCustomer.total_orders,
        updatedCustomer.status,
        updatedCustomer.notes,
        updatedCustomer.division,
        updatedCustomer.district,
        updatedCustomer.city,
        updatedCustomer.area,
        updatedCustomer.post_code,
        updatedCustomer.sector,
        updatedCustomer.road,
        updatedCustomer.house,
        updatedCustomer.phone,
        updatedCustomer.alt_phone,
        updatedCustomer.whatsapp,
        updatedCustomer.email,
        updatedCustomer.verify,
        updatedCustomer.image_url,
        updatedCustomer.image_public_id,
        id,
      ]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

//customer transaction history
export async function getCustomerTransactionHistoryService({
  customerId,
  fromDate,
  toDate,
  type,
  limit = 10,
  page = 1,
}) {
  const offset = (page - 1) * limit;
  let params = [customerId, customerId, customerId];

  let baseSql = `
    (
      SELECT 
        s.id AS ref_id,
        'Purchased' AS type,
        s.invoice_no AS reference,
        s.total_amount AS amount,
        s.customer_id,
        c.name AS customer_name,
        s.user_id,
        s.status,
        s.paid_amount paid,
        s.due_amount due,
        s.payment_method method,
        u.name AS seller_name,
        DATE_FORMAT(
          CONVERT_TZ(s.created_at,'+00:00','+00:00'),
          '%Y-%m-%d %H:%i:%s'
        ) AS created_at
      FROM sales s
      JOIN customers c ON c.id = s.customer_id
      JOIN users u ON u.id = s.user_id
      WHERE s.customer_id = ?
    )

    UNION ALL

    (
      SELECT 
        p.id AS ref_id,
        IF(p.payment_type='due_payment','DuePayment','Payment') AS type,
        p.reference_no AS reference,
        p.amount,
        p.customer_id,
        c.name AS customer_name,
        p.user_id,
        p.payment_type AS status,
        p.amount paid,
        NULL AS due,
        p.method method,
        u.name AS seller_name,
        DATE_FORMAT(
          CONVERT_TZ(p.created_at,'+00:00','+00:00'),
          '%Y-%m-%d %H:%i:%s'
        ) AS created_at
      FROM payments p
      JOIN customers c ON c.id = p.customer_id
      JOIN users u ON u.id = p.user_id
      WHERE p.customer_id = ?
    )

    UNION ALL

    (
      SELECT 
        r.id AS ref_id,
        'Refund' AS type,
        r.sale_id AS reference,
        r.refund_amount AS amount,
        r.customer_id,
        c.name AS customer_name,
        r.user_id,
        NULL AS status,
        r.refund_amount paid,
        NULL AS due,
        r.refund_method method,
        u.name AS seller_name,
        DATE_FORMAT(
          CONVERT_TZ(r.created_at,'+00:00','+00:00'),
          '%Y-%m-%d %H:%i:%s'
        ) AS created_at
      FROM refunds r
      JOIN customers c ON c.id = r.customer_id
      JOIN users u ON u.id = r.user_id
      WHERE r.customer_id = ?
    )
  `;

  let sql = `SELECT * FROM (${baseSql}) t WHERE 1=1`;

  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }


  if (fromDate && toDate) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}



//customer transaction count
export async function getCustomerTransactionCount({
  customerId,
  fromDate,
  toDate,
  type,
}) {
  let params = [customerId, customerId, customerId];

  let baseSql = `
    (
      SELECT s.id, s.created_at, 'Purchased' AS type
      FROM sales s
      WHERE s.customer_id = ?
    )

    UNION ALL

    (
      SELECT p.id, p.created_at,
      IF(p.payment_type='due_payment','DuePayment','Payment') AS type
      FROM payments p
      WHERE p.customer_id = ?
    )

    UNION ALL

    (
      SELECT r.id, r.created_at, 'Refund' AS type
      FROM refunds r
      WHERE r.customer_id = ?
    )
  `;

  let sql = `
    SELECT
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN type = 'Purchased' THEN 1 ELSE 0 END) AS purchased_count,
      SUM(CASE WHEN type = 'Payment' THEN 1 ELSE 0 END) AS payment_count,
      SUM(CASE WHEN type = 'DuePayment' THEN 1 ELSE 0 END) AS duepayment_count,
      SUM(CASE WHEN type = 'Refund' THEN 1 ELSE 0 END) AS refund_count
      FROM (${baseSql}) t 
      WHERE 1=1
      `;

  // type filter
  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }

  // date filter
  if (fromDate && toDate) {
    sql += ` AND DATE(t.created_at) BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  const [[row]] = await pool.query(sql, params);
  return row;
}

export async function getCustomerSalesItemsService(
  saleId,
  customerId,
  userId
) {
  const [rows] = await pool.query(
    `
    SELECT 
      si.*,
      si.subtotal total,
      p.name product_name,
      p.image_url image,
      s.invoice_no AS invoice,
      DATE_FORMAT(
        CONVERT_TZ(si.created_at,'+00:00','+00:00'),
        '%d-%m-%Y %I:%i %p'
      ) AS created_at,
      u.name AS user_name,
      c.name AS customer
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN products p ON p.id = si.product_id
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE 
      s.id = ?
      AND s.user_id = ?
      AND s.customer_id = ?
    ORDER BY si.id DESC
    `,
    [saleId, userId, customerId]
  );

  return rows;
}



// Delete customer
export async function deleteCustomerService(id) {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query("DELETE FROM customers WHERE id=?", [id]);
    if (!result.affectedRows) throw new Error("Customer not found");
  } finally {
    conn.release();
  }
}
