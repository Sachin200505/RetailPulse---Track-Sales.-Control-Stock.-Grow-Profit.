"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Product_1 = __importDefault(require("../models/Product"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const router = express_1.default.Router();
/**
 * @route   POST /api/products
 * @access  Admin
 */
router.post("/", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin"), async (req, res) => {
    try {
        const product = await Product_1.default.create({
            ...req.body,
            createdBy: req.user?._id,
        });
        res.status(201).json(product);
    }
    catch (err) {
        res.status(400).json({ message: "Product creation failed" });
    }
});
/**
 * @route   GET /api/products
 * @access  Private
 */
router.get("/", auth_middleware_1.protect, async (req, res) => {
    const { search } = req.query;
    const filter = search
        ? {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } },
            ],
        }
        : {};
    const products = await Product_1.default.find(filter).sort({ createdAt: -1 });
    res.json(products);
});
router.get("/:id", auth_middleware_1.protect, async (req, res) => {
    const product = await Product_1.default.findById(req.params.id);
    if (!product)
        return res.status(404).json({ message: "Product not found" });
    res.json(product);
});
router.get("/:id", auth_middleware_1.protect, async (req, res) => {
    const product = await Product_1.default.findById(req.params.id);
    if (!product)
        return res.status(404).json({ message: "Product not found" });
    res.json(product);
});
/**
 * @route   PUT /api/products/:id
 * @access  Admin
 */
router.put("/:id", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin"), async (req, res) => {
    const updated = await Product_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
        return res.status(404).json({ message: "Product not found" });
    }
    res.json(updated);
});
/**
 * @route   DELETE /api/products/:id
 * @access  Admin
 */
router.delete("/:id", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin"), async (req, res) => {
    const deleted = await Product_1.default.findByIdAndDelete(req.params.id);
    if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted" });
});
exports.default = router;
//# sourceMappingURL=product.routes.js.map