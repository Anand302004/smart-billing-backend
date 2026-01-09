const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  deleteUser,
  getAllUsers,
  updateUsers
} = require("../controllers/auth.controller");

const {
  verifyToken,
  sendReq,
  isAdmin
} = require("../middleware/authMiddleware");

const { verifyOtp, disableUser, enableUser } = require("../controllers/verification");

/* ================= AUTH ================= */
router.post("/signup", verifyOtp(), signup);
router.post("/login", login);
router.delete("/delete",verifyToken, deleteUser);
router.put("/disable/:id", verifyToken, isAdmin, disableUser);
router.put("/enable/:id", verifyToken, isAdmin, enableUser);

/* ================= USER ================= */
router.put("/update", verifyToken, updateUsers);
router.get("/profile", verifyToken, sendReq);

/* ================= ADMIN ================= */
router.get("/users", verifyToken, isAdmin, getAllUsers);

module.exports = router;
