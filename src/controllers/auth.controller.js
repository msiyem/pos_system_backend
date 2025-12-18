import { loginUser } from "../services/auth.service.js";
import { findUserByEmail } from "../services/user.service.js";
import { verifyRefreshToken, signAccessToken } from "../utils/jwt.js";

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await findUserByEmail(email); // model call
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const { accessToken, refreshToken } = await loginUser(user, password);

  // 🔐 Refresh token → HttpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production" || false,
    // sameSite: "Strict",
    sameSite: "lax",
    path: "/",
  });

  // ✅ Access token → RESPONSE BODY
  res.json({
    accessToken,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
    },
  });
}

export function refresh(req, res) {
  console.log("Cookies in refresh:", req.cookies);
  const token = req.cookies.refreshToken;

  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = verifyRefreshToken(token);

    const newAccessToken = signAccessToken({
      id: decoded.id,
      role: decoded.role,
    });

    res.json({
      accessToken: newAccessToken,
      user: {
        id: decoded.id,
        role: decoded.role,
      },
    });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
}

export function logout(req, res) {
  res.clearCookie("refreshToken", {
    path: "/",
  });
  res.json({ message: "Logged out" });
}
