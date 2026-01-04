import app from "./app.js";

import { createFirstAdmin } from "./bootstrap/bootstrapAdmin.js";

const PORT = process.env.PORT || 3000;

await createFirstAdmin();




app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
