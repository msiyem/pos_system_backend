export const getCustomerDebt = async (conn, customer_id) => {
  const [[rows]] = await conn.query(
    "SELECT IFNULL(debt,0) AS debt FROM customers WHERE id = ?",
    [customer_id]
  );
  return Number(rows?.debt || 0)
};

export const insertSale=async(conn,data)=>{
  const [res] = await conn.query(
    `INSERT INTO sales 
      (customer_id, user_id, subtotal, tax, discount, total_amount, paid_amount, due_amount, payment_method)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      Object.values(data)
  );
  return res.insertId;

}



