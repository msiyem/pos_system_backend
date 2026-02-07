import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.expiresIn,
    },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
    },
    env.jwt.refreshSecret,
    {
      expiresIn: env.jwt.refreshExpiresIn,
    },
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.jwt.refreshSecret);
  } catch (error) {
    return null;
  }
}

export function getTokenExpiry(token) {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}

export function getTokenMaxAgeMs(token) {
  const expiresAt = getTokenExpiry(token);
  if (!expiresAt) {
    return null;
  }
  return Math.max(0, expiresAt.getTime() - Date.now());
}
