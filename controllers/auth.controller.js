import pool from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/* ================= SIGNUP ================= */
 export const signup = async (req, res) => {
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
export const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
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

  /* ===== ACCESS TOKEN (SHORT LIFE) ===== */
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  /* ===== REFRESH TOKEN (LONG LIFE) ===== */
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  /* ===== SAVE REFRESH TOKEN ===== */
  await pool.query(
    `INSERT INTO user_refresh_tokens(user_id, refresh_token)
     VALUES ($1,$2)`,
    [user.id, refreshToken]
  );

  /* ===== SEND COOKIE ===== */
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,       // production -> true
    sameSite: "lax",
  });

  res.json({
    message: "Login successful",
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

export const logout = async (req, res) => {
  try {

    const token = req.cookies.refreshToken;

    // refresh token delete from DB
    if (token) {
      await pool.query(
        `DELETE FROM user_refresh_tokens
         WHERE refresh_token = $1`,
        [token]
      );
    }

    // clear cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.json({ message: "Logged out successfully" });

  } catch (err) {
    res.status(500).json({ message: "Logout failed" });
  }
};


/* ===========================
   REFRESH ACCESS TOKEN
=========================== */
export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        message: "No refresh token",
      });
    }

    // ✅ verify refresh token
    const decoded = jwt.verify(
      token,
      process.env.REFRESH_SECRET
    );

    // ✅ check token exists in DB
    const tokenResult = await pool.query(
      `SELECT * FROM user_refresh_tokens
       WHERE refresh_token=$1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(403).json({
        message: "Invalid refresh token",
      });
    }

    // ✅ IMPORTANT — fetch FULL USER DATA
    const userResult = await pool.query(
      `SELECT id,email,role FROM users WHERE id=$1`,
      [decoded.id]
    );

    const user = userResult.rows[0];

    // ✅ CREATE NEW ACCESS TOKEN (FULL PAYLOAD)
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2m" }
    );

    res.json({
      accessToken: newAccessToken,
    });

  } catch (err) {
    return res.status(403).json({
      message: "Refresh failed",
    });
  }
};


/* ================= DELETE USER ================= */
export const deleteUser = async (req, res) => {
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
export const getAllUsers = async (req, res) => {
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
export const updateUsers = async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {

    // 1️⃣ Get user
    const userResult = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];

    // 2️⃣ Verify current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is wrong"
      });
    }

    // 3️⃣ Hash new password if provided
    let hashedPassword = null;

    if (newPassword) {
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    // 4️⃣ Update fields
    const result = await pool.query(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        password = COALESCE($2, password)
      WHERE id = $3
      RETURNING id, name, email
      `,
      [name, hashedPassword, userId]
    );

    res.json({
      message: "Account updated successfully",
      user: result.rows[0]
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Update failed" });
  }
};

