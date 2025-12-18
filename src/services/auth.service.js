import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
} from "../utils/jwt.js";

export async function loginUser(user, password) {
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid credentials");

  const accessToken = signAccessToken({
    id: user.id,
    role: user.role,
  });

  const refreshToken = signRefreshToken({
    id: user.id,
    role: user.role,
  });

  return { accessToken, refreshToken };
}
