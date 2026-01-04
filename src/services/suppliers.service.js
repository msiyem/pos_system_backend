import { cloudinary } from "../config/cloudinary.js";
import pool from "../config/db.js";

// Add Supplier
export async function addSupplierService(data, image_url, image_public_id) {
  const {
    name,
    gender,
    birthday,
    phone,
    alt_phone,
    whatsapp,
    email,
    division,
    district,
    city,
    area,
    post_code,
    sector,
    road,
    house,
  } = data;

  const [rows] = await pool.query(
    `INSERT INTO suppliers (
      name,
      gender,
      birthday,
      phone,
      alt_phone,
      whatsapp,
      email,
      division,
      district,
      city,
      area,
      post_code,
      sector,
      road,
      house,
      image_url,
      image_public_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      name,
      gender,
      birthday,
      phone,
      alt_phone,
      whatsapp,
      email,
      division,
      district,
      city,
      area,
      post_code,
      sector,
      road,
      house,
      image_url,
      image_public_id,
    ]
  );

  return rows.insertId;
}

// Get all suppliers (with pagination + search)
export async function getSuppliersService(query) {
  let { page, limit, search } = query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 9;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT
      s.*,
      DATE_FORMAT(s.birthday, '%d-%m-%Y') AS birthday,
      DATE_FORMAT(CONVERT_TZ(s.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS created_at,
      DATE_FORMAT(CONVERT_TZ(s.last_transition,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS last_transition
    FROM suppliers s
  `;

  let countsql = `SELECT COUNT(*) as total FROM suppliers s`;
  const params = [];

  if (search) {
    sql += ` WHERE (s.name LIKE ? OR s.phone LIKE ?)`;
    countsql += ` WHERE (s.name LIKE ? OR s.phone LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY s.id LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  const [countRows] = await pool.query(
    countsql,
    search ? [`%${search}%`, `%${search}%`] : []
  );

  return {
    data: rows,
    total: countRows[0].total,
    page,
    limit,
  };
}

// Get supplier details
export async function getSupplierDetailsService(id) {
  const [rows] = await pool.query(
    `SELECT
      s.*,
      DATE_FORMAT(s.birthday, '%Y-%m-%d') AS birthday,
      DATE_FORMAT(CONVERT_TZ(s.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS created_at,
      DATE_FORMAT(CONVERT_TZ(s.last_transition,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS last_transition
      FROM suppliers s
      WHERE s.id = ?`,
    [id]
  );

  return rows;
}

//Update supplier
export async function updateSupplierService(
  id,
  data,
  image_url,
  image_public_id
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existingSupplier] = await conn.query(
      "SELECT * FROM suppliers WHERE id=?",
      [id]
    );
    if (!existingSupplier.length) {
      await conn.rollback();
      throw new Error("Supplier not found");
    }
    const oldSupp = existingSupplier[0];
    const removeImage = data.removeImage === "true";
    if (
      (image_public_id && oldSupp.image_public_id) ||
      (removeImage && oldSupp.image_public_id)
    ) {
      await cloudinary.uploader.destroy(oldSupp.image_public_id);
    }
    const {
      name,
      gender,
      birthday,
      phone,
      alt_phone,
      whatsapp,
      email,
      division,
      district,
      city,
      area,
      post_code,
      sector,
      road,
      house,
    } = data;

    const updateSupplier = {
      name: name ?? oldSupp.name,
      gender: gender ?? oldSupp.gender,
      birthday: birthday ?? oldSupp.birthday,
      phone: phone ?? oldSupp.phone,
      alt_phone: alt_phone ?? oldSupp.alt_phone,
      whatsapp: whatsapp ?? oldSupp.whatsapp,
      email: email ?? oldSupp.email,
      division: division ?? oldSupp.division,
      district: district ?? oldSupp.district,
      city: city ?? oldSupp.city,
      area: area ?? oldSupp.area,
      post_code: post_code ?? oldSupp.post_code,
      sector: sector ?? oldSupp.sector,
      road: road ?? oldSupp.road,
      house: house ?? oldSupp.house,
      image_url: removeImage ? null : image_url ?? oldSupp.image_url,
      image_public_id: removeImage
        ? null
        : image_public_id ?? oldSupp.image_public_id,
    };

    await conn.query(
      `UPDATE suppliers
      SET 
      name=?,
      gender=?,
      birthday=?,
      phone=?,
      alt_phone=?,
      whatsapp=?,
      email=?,
      division=?,
      district=?,
      city=?,
      area=?,
      post_code=?,
      sector=?,
      road=?,
      house=?,
      image_url=?,
      image_public_id=?
      WHERE id=?`,
      [
        updateSupplier.name,
        updateSupplier.gender,
        updateSupplier.birthday,
        updateSupplier.phone,
        updateSupplier.alt_phone,
        updateSupplier.whatsapp,
        updateSupplier.email,
        updateSupplier.division,
        updateSupplier.district,
        updateSupplier.city,
        updateSupplier.area,
        updateSupplier.post_code,
        updateSupplier.sector,
        updateSupplier.road,
        updateSupplier.house,
        updateSupplier.image_url,
        updateSupplier.image_public_id,
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

// Delete supplier
export async function deleteSupplierService(id) {
  await pool.query("DELETE FROM suppliers WHERE id=?", [id]);
}
