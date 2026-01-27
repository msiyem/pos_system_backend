import {
  getUsersService,
  getUserDetailsService,
  addUserService,
  updateUserService,
  deleteUserService,
  isUserExists,
  getUserOwnDetailsService,
} from "../services/users.service.js";
import { addUserSchema } from "../validators/user.validator.js";

export async function getUsers(req, res) {
  try {
    const result = await getUsersService(req.query);
    res.json({ success: true, message: "Fetched successfully", ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function getUserOwnDetails(req, res) {
  try {
    const result = await getUserOwnDetailsService(req.user.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getUserDetails(req, res) {
  try {
    const rows = await getUserDetailsService(req.params.id);
    if (!rows.length)
      return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function addUser(req, res) {
  try {
    const parsed = addUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        errors: parsed.error.fieldErrors,
      });
    }

    const { email, username = "" } = parsed.data;

    const exists = await isUserExists(email, username);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Email or username already exists",
      });
    }

    let image_url = null;
    let image_public_id = null;

    if (req.file) {
      image_url = req.file?.path;
      image_public_id = req.file?.filename;
    }

    const userId = await addUserService(
      parsed.data,
      image_url,
      image_public_id,
      req.user.id,
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      userId,
    });
  } catch (err) {
    console.error("Add user error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function updateUser(req, res) {
  let image_url = null;
  let image_public_id = null;

  if (req.file) {
    image_url = req.file?.path;
    image_public_id = req.file?.filename;
  }

  try {
    await updateUserService(
      req.params.id,
      req.body,
      image_url,
      image_public_id,
    );

    res.json({
      success: true,
      message: `User updated successfully, Id=${req.params.id}`,
    });
  } catch (err) {
    console.error(err);
    if (err.message === "User not found")
      return res.status(404).json({ message: err.message });
    res.status(500).json({ error: err.message });
  }
}

export async function deleteUser(req, res) {
  try {
    await deleteUserService(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
