export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role?.toLowerCase())) {
      return res.status(403).json({ error: "Access Denied!" });
    }
    next();
  };
};