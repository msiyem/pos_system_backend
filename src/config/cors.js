import cors from "cors";

const allowedOrigins = [
  "http://localhost:5173",   // Vite
  "http://localhost:3000",   // React
];

export const corsConfig = cors({
  origin: function (origin, callback) {
    // allow server-to-server or Postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // allow cookies
  methods: ["GET", "POST", "PUT", "DELETE"],
});
