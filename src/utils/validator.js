export function requireFields(fields, data) {
  const missing = fields.filter((field) => !data[field]);

  if (missing.length > 0) {
    const error = new Error(
      `Missing required fields: ${missing.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }
}
