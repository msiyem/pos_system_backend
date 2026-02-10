import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: {
    message: "Too many login attempts. Try again later.",
  },
});

export const userLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 70,

  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user-${req.user.id}`; 
    }
    return ipKeyGenerator(req); 
  },
});
