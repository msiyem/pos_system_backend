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

// ===== Global Middlewares =====
app.use(corsConfig);
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  console.log("METHOD:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("BODY (before multer):", req.body);
  next();
});

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
