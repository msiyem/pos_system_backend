import crypto from "crypto";
import pool from "../config/db.js";
import { getTokenExpiry } from "../utils/jwt.js";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function storeRefreshToken(userId, token) {
  const expiresAt = getTokenExpiry(token);
  if (!expiresAt) {
    const error = new Error("Invalid refresh token payload");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashToken(token);
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt],
  );
}

export async function getRefreshTokenRecord(token) {
  const tokenHash = hashToken(token);
  const [rows] = await pool.query(
    "SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1",
    [tokenHash],
  );

  return rows[0];
}

export async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  await pool.query("DELETE FROM refresh_tokens WHERE token_hash = ?", [
    tokenHash,
  ]);
}

export async function revokeAllRefreshTokens(userId) {
  await pool.query("DELETE FROM refresh_tokens WHERE user_id = ?", [userId]);
}

export async function rotateRefreshToken(oldToken, userId, newToken) {
  const newExpiresAt = getTokenExpiry(newToken);
  if (!newExpiresAt) {
    const error = new Error("Invalid refresh token payload");
    error.statusCode = 400;
    throw error;
  }

  const oldHash = hashToken(oldToken);
  const newHash = hashToken(newToken);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM refresh_tokens WHERE token_hash = ?", [
      oldHash,
    ]);
    await connection.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [userId, newHash, newExpiresAt],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
