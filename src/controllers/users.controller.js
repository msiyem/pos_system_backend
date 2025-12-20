import { getAllUsersService ,getUserDetails} from "../services/users.service.js";

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

export async function getUserById(req,res){
  try{
    const rows= await getUserDetails(req.params.id);
    if (!rows.length) return res.status(404).json({ message: "user not found" });
    res.json(rows[0]);
  }catch(err){
    console.error(err);
    res.status(500).json({error:err.message});

  }
}

