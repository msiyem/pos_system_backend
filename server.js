import express from "express";
import pool from "./db.js";
import cors from "cors";
import customerRoutes from "./routes/customers.js";
import userRoutes from "./routes/users.js";

import productRoutes from "./routes/products.js";
import brandRoutes from "./routes/brands.js";
import categoryRoutes from "./routes/categories.js";
import taxRateRoutes from "./routes/taxRates.js";
import inventoryRoutes from "./routes/inventoryLog.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// users route
app.use("/users", userRoutes);

// customers route
app.use("/customers", customerRoutes);

// app.post("/users", async (req, res) => {
//   try {
//     const { name, email, password, phone, role } = req.body;
//     const [result] = await pool.query(
//       "INSERT INTO users (name, email,password,phone,role) VALUES (?, ?,?,?,?)",
//       [name, email, password, phone, role]
//     );
//     res.json({ id: result.insertId, name, email, password, phone, role });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("database error");
//   }
// });

app.use("/products", productRoutes);
app.use("/brands", brandRoutes);
app.use("/categories", categoryRoutes);
app.use("/tax-rates", taxRateRoutes);
app.use("/inventory", inventoryRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
