import express from "express";
import { getAllUsers,getUserById } from "../controllers/users.controller.js";
// import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();

router.get("/users", getAllUsers);
router.get("/user/:id", getUserById);

export default router;
