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
      DATE_FORMAT(CONVERT_TZ(c.last_purchased,'+00:00','+06:00'), '%d-%m-%Y %I:%i %p') AS last_purchased
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
      DATE_FORMAT(CONVERT_TZ(c.last_purchased,'+00:00','+06:00'), '%d-%m-%Y %I:%i %p') AS last_purchased
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
