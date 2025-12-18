import { getAllUsersService } from "../services/users.service.js";

export async function getAllUsers(req, res) {
  try {
    const rows = await getAllUsersService();
    res.json({
      success: true,
      message: "Fetched successfully",
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
