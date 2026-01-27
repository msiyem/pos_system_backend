import { loginUser } from "../services/auth.service.js";
import { findUserByEmail } from "../services/user.service.js";
import { verifyRefreshToken, signAccessToken } from "../utils/jwt.js";
import { getUserDetailsService } from "../services/users.service.js";
import { env } from "../config/env.js";

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await findUserByEmail(email); // model call
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const { accessToken, refreshToken } = await loginUser(user, password);

  //  Refresh token → HttpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    secure: env.cookie.secure,
    // sameSite: "Strict",
    sameSite: env.cookie.sameSite,
    path: "/",
  });

  //  Access token → RESPONSE BODY
  res.json({
    accessToken,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
    },
  });
}

export async function refresh(req, res) {
  console.log("Cookies in refresh:", req.cookies);
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "No refresh token" });
  }


    const decoded = verifyRefreshToken(token);
    if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

    const users = await getUserDetailsService(decoded.id);
    
    const user=users[0];
    if(!user){
      return res.status(401).json({message: "User not found!"});
    }

    const newAccessToken = signAccessToken(user);

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
      },
    });
  
    
  
}

export function logout(req, res) {
  res.clearCookie("refreshToken", {
    path: "/",
  });
  res.json({ message: "Logged out" });
}
