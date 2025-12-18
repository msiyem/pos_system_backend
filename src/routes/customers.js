import express from "express";
import pool from "../config/db.js";


const router = express.Router();

//GET all customers......

router.get("/", async (req, res) => {
  let { page, limit, search } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 9;
  const offset = (page - 1) * limit;
  try {
    let sql = `
    SELECT 
    c.*,
    DATE_FORMAT(c.birthday, '%d-%m-%Y') AS birthday,
    DATE_FORMAT(CONVERT_TZ(c.join_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS join_at,
    DATE_FORMAT(CONVERT_TZ(c.last_purchased,'+00:00','+06:00'), '%d-%m-%Y %I:%i %p') AS last_purchased,
    a.*,
    DATE_FORMAT(CONVERT_TZ(a.created_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS created_at,
    con.*
    FROM customers c
    LEFT JOIN cus_addr a ON c.id=a.cus_id
    LEFT JOIN cus_contact con ON c.id=con.cus_id
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
    //when insert then rows,fields
    const [rows, fields] = await pool.query(sql, params);
    const [countRows] = await pool.query(
      countsql,
      search ? [`%${search}%`] : []
    );
    const total = countRows[0].total;
    
    res.json({
      success: true,
      message: "Fetched successfully",
      data: rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/details", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `
    SELECT 
    c.*,
    DATE_FORMAT(c.birthday, '%d-%m-%Y') AS birthday,
    DATE_FORMAT(CONVERT_TZ(c.join_at,'+00:00','+00:00'), '%d-%m-%Y %I:%i %p') AS join_at,
    DATE_FORMAT(CONVERT_TZ(c.last_purchased,'+00:00','+06:00'), '%d-%m-%Y %I:%i %p') AS last_purchased,
    a.*,
    DATE_FORMAT(CONVERT_TZ(a.created_at,'+00:00','+06:00'), '%d-%m-%Y %I:%i %p') AS created_at,
    con.*
    FROM customers c
    LEFT JOIN cus_addr a ON c.id=a.cus_id
    LEFT JOIN cus_contact con ON c.id=con.cus_id
    WHERE c.id = ?
    `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  const {
    name,
    gender,
    birthday,
    debt,
    total_orders,
    status,
    notes,
    address,
    contact,
  } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [customerResult] = await conn.query(
      `INSERT INTO customers (name, gender, birthday, debt, total_orders, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        gender || "male",
        birthday || null,
        debt || 0,
        total_orders || 0,
        status || "active",
        notes || null,
      ]
    );
    const customerId = customerResult.insertId;

    if (address) {
      const { division, district, city, area, post_code, sector, road, house } =
        address;
      await conn.query(
        `INSERT INTO cus_addr (cus_id, division, district, city, area, post_code, sector, road, house)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          division,
          district,
          city,
          area,
          post_code,
          sector,
          road,
          house,
        ]
      );
    }

    if (contact) {
      const { phone, alt_phone, whatsapp, email, verify } = contact;
      await conn.query(
        `INSERT INTO cus_contact (cus_id, phone, alt_phone, whatsapp, email, verify)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [customerId, phone, alt_phone, whatsapp, email, verify || 0]
      );
    }
    await conn.commit();
    res
      .status(201)
      .json({ message: "Customer created successsfully", id: customerId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

//put _update customer/address /contact (transaction)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    gender,
    birthday,
    debt,
    total_orders,
    status,
    notes,
    address,
    contact,
  } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Check isCustomer Exist
    const [existingCustomer] = await conn.query(
      "SELECT * FROM customers WHERE id=?",
      [id]
    );
    if (!existingCustomer.length) {
      await conn.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const oldCust = existingCustomer[0];

    //merge old to new
    const updatedCustomer = {
      name: name ?? oldCust.name,
      gender: gender ?? oldCust.gender,
      birthday: birthday ?? oldCust.birthday,
      debt: debt ?? oldCust.debt,
      total_orders: total_orders ?? oldCust.total_orders,
      status: status ?? oldCust.status,
      notes: notes ?? oldCust.notes,
    };

    await conn.query(
      `UPDATE customers 
       SET name=?, gender=?, birthday=?, debt=?, total_orders=?, status=?, notes=? 
       WHERE id=?`,
      [
        updatedCustomer.name,
        updatedCustomer.gender,
        updatedCustomer.birthday,
        updatedCustomer.debt,
        updatedCustomer.total_orders,
        updatedCustomer.status,
        updatedCustomer.notes,
        id,
      ]
    );

    if (address) {
      const [existingAddr] = await conn.query(
        "SELECT * FROM cus_addr WHERE cus_id=?",
        [id]
      );

      const oldAddr = existingAddr[0] || {};

      const updatedAddr = {
        division: address.division ?? oldAddr.division ?? null,
        district: address.district ?? oldAddr.district ?? null,
        city: address.city ?? oldAddr.city ?? null,
        area: address.area ?? oldAddr.area ?? null,
        post_code: address.post_code ?? oldAddr.post_code ?? null,
        sector: address.sector ?? oldAddr.sector ?? null,
        road: address.road ?? oldAddr.road ?? null,
        house: address.house ?? oldAddr.house ?? null,
      };

      if (existingAddr.length) {
        await conn.query(
          `UPDATE cus_addr 
           SET division=?, district=?, city=?, area=?, post_code=?, sector=?, road=?, house=? 
           WHERE cus_id=?`,
          [
            updatedAddr.division,
            updatedAddr.district,
            updatedAddr.city,
            updatedAddr.area,
            updatedAddr.post_code,
            updatedAddr.sector,
            updatedAddr.road,
            updatedAddr.house,
            id,
          ]
        );
      } else {
        await conn.query(
          `INSERT INTO cus_addr 
           (cus_id, division, district, city, area, post_code, sector, road, house)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            updatedAddr.division,
            updatedAddr.district,
            updatedAddr.city,
            updatedAddr.area,
            updatedAddr.post_code,
            updatedAddr.sector,
            updatedAddr.road,
            updatedAddr.house,
          ]
        );
      }
    }

    if (contact) {
      const [existingCon] = await conn.query(
        "SELECT * FROM cus_contact WHERE cus_id=?",
        [id]
      );

      const oldCon = existingCon[0] || {};

      const updatedCon = {
        phone: contact.phone ?? oldCon.phone ?? null,
        alt_phone: contact.alt_phone ?? oldCon.alt_phone ?? null,
        whatsapp: contact.whatsapp ?? oldCon.whatsapp ?? null,
        email: contact.email ?? oldCon.email ?? null,
        verify: Number(contact.verify ?? oldCon.verify ?? 0),
      };

      if (existingCon.length) {
        await conn.query(
          `UPDATE cus_contact 
           SET phone=?, alt_phone=?, whatsapp=?, email=?, verify=? 
           WHERE cus_id=?`,
          [
            updatedCon.phone,
            updatedCon.alt_phone,
            updatedCon.whatsapp,
            updatedCon.email,
            updatedCon.verify,
            id,
          ]
        );
      } else {
        await conn.query(
          `INSERT INTO cus_contact 
           (cus_id, phone, alt_phone, whatsapp, email, verify)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            updatedCon.phone,
            updatedCon.alt_phone,
            updatedCon.whatsapp,
            updatedCon.email,
            updatedCon.verify,
          ]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: "Customer updated successfully" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});


// DELETE – remove customer (cascade)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();

  try {
    const [result] = await conn.query("DELETE FROM customers WHERE id=?", [id]);
    if (!result.affectedRows)
      return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
