import cors from "cors";

const allowedOrigins = [
  "http://localhost:5173", // Vite
  "http://localhost:3000", // React
  "http://localhost:4173", // Preview
  "https://pos-system-six-jade.vercel.app", // Preview
];

export const corsConfig = cors({
  origin: function (origin, callback) {
    // allow server-to-server or Postman
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.endsWith("/")
      ? origin.slice(0, -1)
      : origin;

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});
