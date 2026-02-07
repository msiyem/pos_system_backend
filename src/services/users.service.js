import pool from "../config/db.js";
import bcrypt from "bcrypt";
import { cloudinary } from "../config/cloudinary.js";

export async function isUserExists(email, username = null) {
  username = username?.trim() || null;
  if (username) {
    const [[user]] = await pool.query(
      `SELECT id FROM users WHERE email=? OR username=? LIMIT 1`,
      [email, username],
    );
    return !!user;
  }

  const [[user]] = await pool.query(
    `SELECT id FROM users WHERE email=? LIMIT 1`,
    [email],
  );
  return !!user;
}

export async function getUserOwnDetailsService(user_id) {
  const [rows] = await pool.query(
    `
    SELECT 
      name,
      email,
      phone,
      username,
      image_url,
      role
    FROM users
    WHERE users.id = ? LIMIT 1`,
    [user_id],
  );
  return rows[0];
}

export async function getUsersService(query) {
  let { page, limit, search, role = null } = query;
  page = Number(page) || 1;
  limit = Number(limit) || 10;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT 
      u.id, 
      u.name, 
      u.username,
      u.email, 
      u.phone,
      u.district,
      u.house,
      u.role, 
      u.status, 
      u.verify,
      u.image_url,
      DATE_FORMAT(u.created_at,'%Y-%m-%d %I:%i %p') AS created_at,
      DATE_FORMAT(u.updated_at,'%Y-%m-%d %I:%i %p') AS updated_at
    FROM users u
  `;

  let countSql = `SELECT COUNT(*) total FROM users u`;

  const conditions = [];
  const params = [];
  const countParams = [];

  if (search) {
    conditions.push(`(u.name LIKE ? OR u.email LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`);
  }

  if (role) {
    conditions.push(`u.role = ?`);
    params.push(role);
    countParams.push(role);
  }

  if (conditions.length) {
    const whereClause = ` WHERE ${conditions.join(" AND ")}`;
    sql += whereClause;
    countSql += whereClause;
  }

  sql += ` ORDER BY u.id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  const [[count]] = await pool.query(countSql, countParams);

  return { data: rows, total: count.total, page, limit };
}

export async function getUserDetailsService(id) {
  const [rows] = await pool.query(
    `
    SELECT 
      u.id,
      u.name,
      u.username,
      u.email,
      u.phone,
      u.alt_phone,
      u.whatsapp,
      u.gender,
      u.role,
      u.status,
      u.verify,
      u.division,
      u.district,
      u.city,
      u.area,
      u.post_code,
      u.road,
      u.house,
      u.image_url,
      u.image_public_id,
      u.created_by,
      u.updated_by,
      creator.name AS created_by_name,
      updater.name AS updated_by_name,
      DATE_FORMAT(u.birthday, '%Y-%m-%d') AS birthday,
      DATE_FORMAT(u.created_at,'%Y-%m-%d %I:%i %p') AS created_at,
      DATE_FORMAT(u.updated_at,'%Y-%m-%d %I:%i %p') AS updated_at
    FROM users u
    LEFT JOIN users creator ON u.created_by = creator.id
    LEFT JOIN users updater ON u.updated_by = updater.id
    WHERE u.id=?
    `,
    [id],
  );
  return rows;
}

export async function addUserService(
  data,
  image_url,
  image_public_id,
  createdBy,
) {
  const {
    name,
    username = null,
    email,
    password,
    role = "staff",
    phone,
    alt_phone = "",
    whatsapp = "",
    gender = "male",
    division = "",
    district = "",
    city = "",
    area = "",
    post_code = "",
    road = "",
    house = "",
    status = "active",
    birthday = "",
  } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `
    INSERT INTO users
    (
      name,
      username,
      email,
      password,
      phone,
      role,
      status,
      image_url,
      image_public_id,
      created_by,
      alt_phone,
      whatsapp,
      gender,
      division,
      district,
      city,
      area,
      post_code,
      road,
      house,
      birthday
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      username,
      email,
      hashedPassword,
      phone || null,
      role,
      status,
      image_url,
      image_public_id,
      createdBy,
      alt_phone,
      whatsapp,
      gender,
      division,
      district,
      city,
      area,
      post_code,
      road,
      house,
      birthday,
    ],
  );

  return result.insertId;
}

export async function updateUserService(id, data, image_url, image_public_id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query("SELECT * FROM users WHERE id=?", [id]);
    if (!rows.length) throw new Error("User not found");

    const old = rows[0];

    const removeImage = data.removeImage === "true";

    if (
      (image_public_id && old.image_public_id) ||
      (removeImage && old.image_public_id)
    ) {
      await cloudinary.uploader.destroy(old.image_public_id);
    }

    await conn.query(
      `
      UPDATE users SET
        name=?,
        phone=?,
        role=?,
        status=?,
        verify=?,
        image_url=?,
        image_public_id=?,
        alt_phone=?,
        whatsapp=?,
        gender=?,
        division=?,
        district=?,
        city=?,
        area=?,
        post_code=?,
        road=?,
        house=?,
        updated_by=?,
        birthday=?
      WHERE id=?
      `,
      [
        data.name ?? old.name,
        data.phone ?? old.phone,
        data.role ?? old.role,
        data.status ?? old.status,
        data.verify ?? old.verify,
        removeImage ? null : (image_url ?? old.image_url),
        removeImage ? null : (image_public_id ?? old.image_public_id),
        data.alt_phone ?? old.alt_phone,
        data.whatsapp ?? old.whatsapp,
        data.gender ?? old.gender,
        data.division ?? old.division,
        data.district ?? old.district,
        data.city ?? old.city,
        data.area ?? old.area,
        data.post_code ?? old.post_code,
        data.road ?? old.road,
        data.house ?? old.house,
        data.updated_by ?? old.updated_by,
        data.birthday ?? old.birthday,
        id,
      ],
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function changeUserPasswordService(userId, password) {
  const hashed = await bcrypt.hash(password, 10);

  const [result] = await pool.query("UPDATE users SET password=? WHERE id=?", [
    hashed,
    userId,
  ]);

  if (!result.affectedRows) {
    throw new Error("User not found");
  }
}

export async function updateUserStatusService(userId, status) {
  const [result] = await pool.query("UPDATE users SET status=? WHERE id=?", [
    status,
    userId,
  ]);

  if (!result.affectedRows) {
    throw new Error("User not found");
  }
}

export async function deleteUserService(id) {
  const [result] = await pool.query("DELETE FROM users WHERE id=?", [id]);
  if (!result.affectedRows) throw new Error("User not found");
}

// ===== User Performance (Sales) =====
export async function getUserPerformanceService(userId, fromDate, toDate) {
  if (!userId) throw new Error("userId required");

  // Default: last 30 days if dates not provided
  let start = fromDate?.trim() || null;
  let end = toDate?.trim() || null;

  if (!start || !end) {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    start = past.toISOString().slice(0, 10);
    end = now.toISOString().slice(0, 10);
  }

  const params = [userId, start, end];

  const [[summary]] = await pool.query(
    `
    SELECT
      COUNT(*)               AS orders,
      COALESCE(SUM(total_amount),0) AS totalAmount,
      COALESCE(SUM(paid_amount),0)  AS totalPaid,
      COALESCE(SUM(due_amount),0)   AS totalDue,
      COALESCE(AVG(total_amount),0) AS avgOrderValue,
      COUNT(DISTINCT customer_id)   AS uniqueCustomers
    FROM sales s
    WHERE s.user_id = ?
      AND s.status = 'completed'
      AND DATE(s.created_at) BETWEEN ? AND ?
    `,
    params,
  );

  const [[items]] = await pool.query(
    `
    SELECT COALESCE(SUM(si.quantity),0) AS itemsSold
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    WHERE s.user_id = ?
      AND s.status = 'completed'
      AND DATE(s.created_at) BETWEEN ? AND ?
    `,
    params,
  );

  const [byDay] = await pool.query(
    `
    SELECT 
      DATE(s.created_at) AS day,
      COUNT(*) AS orders,
      COALESCE(SUM(s.total_amount),0) AS revenue,
      COALESCE(SUM(s.paid_amount),0)  AS paid,
      COALESCE(SUM(s.due_amount),0)   AS due
    FROM sales s
    WHERE s.user_id = ?
      AND s.status = 'completed'
      AND DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY DATE(s.created_at)
    ORDER BY day DESC
    `,
    params,
  );

  const [byPaymentMethod] = await pool.query(
    `
    SELECT 
      s.payment_method,
      COUNT(*) AS orders,
      COALESCE(SUM(s.total_amount),0) AS revenue
    FROM sales s
    WHERE s.user_id = ?
      AND s.status = 'completed'
      AND DATE(s.created_at) BETWEEN ? AND ?
    GROUP BY s.payment_method
    ORDER BY revenue DESC
    `,
    params,
  );

  return {
    range: { fromDate: start, toDate: end },
    summary: { ...summary, itemsSold: Number(items?.itemsSold || 0) },
    byDay,
    byPaymentMethod,
  };
}
