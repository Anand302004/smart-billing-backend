import express from "express";

import { getShop, createShop, updateShop } from "../controllers/shop.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getShop);
router.post("/", verifyToken, createShop);
router.put("/", verifyToken, updateShop);

export default router;
