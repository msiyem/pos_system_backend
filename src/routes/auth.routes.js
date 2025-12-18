import express from "express";
import { login, refresh, logout } from "../controllers/auth.controller.js";
import {loginLimiter} from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
