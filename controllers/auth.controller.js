const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* ================= SIGNUP ================= */
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, role || "user"]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

/* ================= LOGIN ================= */
const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = result.rows[0];

  if (!user.is_active) {
    return res.status(403).json({ message: "Account is deactivated" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Wrong password" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

/* ================= DELETE USER ================= */
const deleteUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1️⃣ Check if user exists
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    // 2️⃣ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    // 3️⃣ Delete user
    const deleteResult = await pool.query(
      "DELETE FROM users WHERE email = $1",
      [email]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(400).json({ message: "Unable to delete user" });
    }

    return res.json({ message: "User deleted successfully" });

  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


/* ================= GET ALL USERS (ADMIN) ================= */
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, is_active, created_at FROM users"
    );

    res.json({
      count: result.rows.length,
      users: result.rows,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/* ================= UPDATE USER ================= */
const updateUsers = async (req, res) => {
  const { username, password } = req.body;
  const userId = req.user?.id;

  if (!username && !password) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  let hashedPassword = null;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  const result = await pool.query(
    `
    UPDATE users
    SET 
      name = COALESCE($1, name),
      password = COALESCE($2, password)
    WHERE id = $3
    RETURNING id, name, email, role
    `,
    [username, hashedPassword, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    message: "User updated successfully",
    user: result.rows[0],
  });
};

module.exports = {
  signup,
  login,
  deleteUser,
  getAllUsers,
  updateUsers,
};
