const express = require("express");
const router = express.Router();
const { signup, login, deleteUser, getAllUsers, updateUsers } = require("../controllers/auth.controller");
const { verifyToken, sendReq } = require("../middleware/authMiddleware");
const { verifyOtp } = require("../controllers/verification");

router.post("/signup", verifyOtp(), signup);
router.post('/login',login)
router.delete('/delete',deleteUser)



//put requesst
router.put('/update',verifyToken, updateUsers)

// 🔒 Protected route middleware
router.get("/profile", verifyToken, sendReq);
router.get("/users", verifyToken, getAllUsers);

module.exports = router;
