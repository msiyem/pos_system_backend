import dotenv from "dotenv";

dotenv.config();

const requiredEnvs = [
  "PORT",
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

requiredEnvs.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

const nodeEnv = process.env.NODE_ENV || "development";
const cookieSecureEnv = process.env.COOKIE_SECURE;
const cookieSameSiteEnv = process.env.COOKIE_SAME_SITE;

export const env = {
  port: Number(process.env.PORT),
  nodeEnv,

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    sslCa: process.env.DB_SSL_CA,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "1d",
  },
  cloudinary: {
    name: process.env.CLOUD_NAME,
    key: process.env.CLOUD_KEY,
    secret: process.env.CLOUD_SECRET,
  },

  cookie: {
    secure:
      cookieSecureEnv !== undefined
        ? cookieSecureEnv === "true"
        : nodeEnv === "production",
    sameSite: cookieSameSiteEnv || (nodeEnv === "production" ? "none" : "lax"),
  },

  logLevel: process.env.LOG_LEVEL || "info",
  bootstrap: {
    enabled: process.env.BOOTSTRAP_ADMIN_ENABLE === "true",
    name: process.env.BOOTSTRAP_ADMIN_NAME,
    username: process.env.BOOTSTRAP_ADMIN_USERNAME,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    once: process.env.BOOTSTRAP_ADMIN_ONCE !== "false",
    onceFile:
      process.env.BOOTSTRAP_ADMIN_ONCE_FILE || "logs/bootstrap-admin.done",
  },
};
