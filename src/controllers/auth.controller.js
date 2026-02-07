import { loginUser } from "../services/auth.service.js";
import { findUserByEmail } from "../services/user.service.js";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  getTokenMaxAgeMs,
} from "../utils/jwt.js";
import { getUserDetailsService } from "../services/users.service.js";
import { env } from "../config/env.js";
import { requireFields } from "../utils/validator.js";
import {
  storeRefreshToken,
  getRefreshTokenRecord,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from "../services/refreshToken.service.js";

const refreshCookieBaseOptions = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: "/",
};

export async function login(req, res, next) {
  try {
    requireFields(["email", "password"], req.body);
  } catch (error) {
    return next(error);
  }

  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email); // model call
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const { accessToken, refreshToken } = await loginUser(user, password);
    await storeRefreshToken(user.id, refreshToken);

    const refreshMaxAgeMs = getTokenMaxAgeMs(refreshToken);

    // Refresh token -> HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      ...refreshCookieBaseOptions,
      maxAge: refreshMaxAgeMs || 24 * 60 * 60 * 1000,
    });

    // Access token -> response body
    res.json({
      accessToken,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    if (error.message === "Invalid credentials") {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const tokenRecord = await getRefreshTokenRecord(token);
    if (!tokenRecord) {
      await revokeAllRefreshTokens(decoded.id);
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const users = await getUserDetailsService(decoded.id);
    const user = users[0];
    if (!user) {
      await revokeAllRefreshTokens(decoded.id);
      return res.status(401).json({ message: "User not found!" });
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await rotateRefreshToken(token, user.id, newRefreshToken);

    const refreshMaxAgeMs = getTokenMaxAgeMs(newRefreshToken);

    res.cookie("refreshToken", newRefreshToken, {
      ...refreshCookieBaseOptions,
      maxAge: refreshMaxAgeMs || 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await revokeRefreshToken(token);
    }

    res.clearCookie("refreshToken", refreshCookieBaseOptions);
    res.json({ message: "Logged out" });
  } catch (error) {
    return next(error);
  }
}
