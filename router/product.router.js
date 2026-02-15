import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { addProduct, getMyProducts, updateProduct, deleteProduct } from "../controllers/product.controller.js";
import { checkSubscription } from "../middleware/checkSubscription.js";

const router = express.Router();

router.post("/", verifyToken, checkSubscription, addProduct);
router.get("/", verifyToken, checkSubscription, getMyProducts);
router.put("/:id", verifyToken, checkSubscription, updateProduct);
router.delete("/:id", verifyToken, checkSubscription, deleteProduct);

export default router;
