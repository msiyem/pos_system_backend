import app from "./app.js";

import cors from "cors";
import customerRoutes from "./routes/customers.js";
import userRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.routes.js";

import productRoutes from "./routes/products.js";
import brandRoutes from "./routes/brands.js";
import categoryRoutes from "./routes/categories.js";
import taxRateRoutes from "./routes/taxRates.js";
import inventoryRoutes from "./routes/inventoryLog.js";

import suppliers from "./routes/suppliers.js";
import purchases from "./routes/purchases.js";
import sales from "./routes/sales.js";
import expenses from "./routes/expenses.js";
import { createFirstAdmin } from "./bootstrap/bootstrapAdmin.js";

const PORT = process.env.PORT || 3000;

// app.use(express.json());

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true,
//   })
// );

// users route
await createFirstAdmin();
// app.use("/users", userRoutes);
// app.use("/auth",authRoutes);
// // customers route
// app.use("/customers", customerRoutes);
// app.use("/products", productRoutes);
// app.use("/brands", brandRoutes);
// app.use("/categories", categoryRoutes);
// app.use("/tax-rates", taxRateRoutes);
// app.use("/inventory", inventoryRoutes);
// app.use("/suppliers", suppliers);
// app.use("/purchase", purchases);
// app.use("/sales", sales);
// app.use("/expenses", expenses);



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
