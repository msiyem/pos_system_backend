import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: {
    message: "Too many login attempts. Try again later.",
  },
});

export const userLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 70,

  // ✅ IPv6-safe key generator
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user-${req.user.id}`; // user-based limit
    }
    return ipKeyGenerator(req); // IP-based fallback (SAFE)
  },
});
