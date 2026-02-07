import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { comparePassword } from "../utils/hash.js";

export async function loginUser(user, password) {
  const match = await comparePassword(password, user.password);
  if (!match) throw new Error("Invalid credentials");

  const accessToken = signAccessToken(user);

  const refreshToken = signRefreshToken(user);

  return { accessToken, refreshToken };
}
