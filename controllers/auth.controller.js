const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken')

const signup = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    //Password Convert to Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (first_name, last_name, email, user_password) VALUES ($1,$2,$3,$4) RETURNING *",
      [first_name, last_name, email, hashedPassword]
    );

    res.json(result.rows[0]);

  } catch (error) {

    // duplicate key error
     if (error.code === "23505") { 
    return res.status(400).json({ message: "Email already exists" });
  }

    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res)=>{
  const {email, password}=req.body

  const result= await pool.query(
    "SELECT * FROM users WHERE email =$1",
    [email]
  );

  if(result.rows.length === 0){
    return res.status(404).json({massage:"User Not Found"})
  }

  const user=result.rows[0]

  //Hash Password Compare to User password
    const ismatch= await bcrypt.compare(password, user.user_password)
    if(!ismatch){
      return res.status(401).json({massage:'Wrong Password'})
    }

    //JWT Token Create
    const token= jwt.sign(
      {id:user.id, email:user.email},
      process.env.JWt_Secret,
      {expiresIn: '1h'} //expire in 1 Hour
    )

    res.json({
      message:'Login Successful',
      token
    });
}

const deleteUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1️⃣ Check if user exists
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User Not Exist" });
    }

    const user = result.rows[0];

    // 2️⃣ Password match check
    const isMatch = await bcrypt.compare(password, user.user_password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong Password" });
    }

    // 3️⃣ Delete user
    const deleteResult = await pool.query(
      "DELETE FROM users WHERE email = $1",
      [email]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(400).json({ message: "Unable to delete user" });
    }

    res.json({ message: "User Deleted Successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something Went Wrong" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email FROM users"
    );

    res.status(200).json({
      count: result.rows.length,
      users: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

const updateUsers = async (req, res) => {
  const { first_name, last_name, password } = req.body;
  const userId = req.user?.id;

  if (!first_name && !last_name && !password) {
  return res.status(400).json({ message: "Nothing to update" });
  }

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `
      UPDATE users
      SET 
        first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        user_password = COALESCE($3, user_password)
      WHERE id = $4
      RETURNING id, first_name, last_name, email
      `,
      [first_name, last_name, hashedPassword, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User Not Found" });
    }

    res.json({
      message: "User updated successfully",
      user: result.rows[0],
    });

  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: "Update failed" });
  }
};


module.exports = { signup,login,deleteUser,getAllUsers, updateUsers };
