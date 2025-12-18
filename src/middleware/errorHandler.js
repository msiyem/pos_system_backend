import logger from "../utils/logger.js";

export default function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  // Log full error (for developers)
  logger.error("API_ERROR", {
    message: err.message,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
    user: req.user?.id || null,
  });

  // Client-safe response
  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message,
  });
}
