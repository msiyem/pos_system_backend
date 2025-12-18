import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import productsRoutes from "./routes/products.routes.js";
import brandsRoutes from "./routes/brands.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import suppliersRoutes from "./routes/suppliers.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import purchasesRoutes from "./routes/purchases.routes.js";
import salesRoutes from "./routes/sales.routes.js";
// import purchasesRoutes from "./routes/purchases.routes.js";
import expensesRoutes from "./routes/expenses.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";

export default {
  // Public routes
  auth: authRoutes,

  // Protected routes
  protected: [
    usersRoutes,
    productsRoutes,
    brandsRoutes,
    categoriesRoutes,
    suppliersRoutes,
    customersRoutes,
    purchasesRoutes,
    salesRoutes,
    expensesRoutes,
    inventoryRoutes,
  ],
};
