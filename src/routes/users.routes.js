import express from "express";
import {
  addUser,
  deleteUser,
  getUserDetails,
  getUserOwnDetails,
  getUsers,
  updateUser,
} from "../controllers/users.controller.js";
import { authorize } from "../middleware/authorize.js";
import upload from "../config/cloudinary.js";

const router = express.Router();

router.get("/users", authorize("admin"), getUsers);
router.get("/users/me",authorize("admin","staff"),getUserOwnDetails);
router.get("/users/:id", authorize("admin"), getUserDetails);

router.post("/users",
  authorize("admin"),
  upload.single("image"),
  addUser
);
router.put(
  "/users/:id",
  authorize("admin"),
  upload.single("image"),
  updateUser
);

router.delete(
  "/users/:id",
  authorize("admin"),
  deleteUser
);

export default router;
