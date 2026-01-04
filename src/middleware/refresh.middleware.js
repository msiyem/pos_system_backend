import { verifyRefreshToken } from "../utils/jwt.js";

export default function refreshAuthenticate(req, res, next) {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  const decoded = verifyRefreshToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

  req.user = decoded;
  next();
}
