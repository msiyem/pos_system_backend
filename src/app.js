// src/app.js
import express from "express";
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import { corsConfig } from "./config/cors.js";
import routes from "./index.js";
import errorHandler from "./middleware/errorHandler.js";
import authenticate from "./middleware/authenticate.js";
import { userLimiter } from "./middleware/rateLimiter.js";

const app = express();
dotenv.config();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ===== Global Middlewares =====
app.use(corsConfig);
app.use(express.json());
app.use(cookieParser());

// ===== Public Routes =====
app.use("/api/auth", routes.auth);


// ===== Protected Routes =====
app.use("/api", authenticate, userLimiter);
routes.protected.forEach((router) => {
  app.use("/api", router);
});


// ===== Health Check =====
app.get("/health", (req, res) => {
  res.json({ status: "OK", time: new Date() });
});

// ===== Global Error Handler =====
app.use(errorHandler);

export default app;
