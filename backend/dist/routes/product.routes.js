"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Product_1 = __importDefault(require("../models/Product"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const CategoryGST_1 = __importDefault(require("../models/CategoryGST"));
const router = express_1.default.Router();
/**
 * @route   POST /api/products
 * @access  Admin
 */
router.post("/", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
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
// Get categories with GST and counts
router.get("/categories/gst", auth_middleware_1.protect, async (_req, res) => {
    const grouped = await Product_1.default.aggregate([
        { $group: { _id: "$category", productCount: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);
    const categoryNames = grouped.map((g) => g._id).filter(Boolean);
    const gstDocs = await CategoryGST_1.default.find({ name: { $in: categoryNames } });
    const gstMap = new Map(gstDocs.map((doc) => [doc.name, doc.gstRate]));
    const response = grouped.map((g) => ({
        name: g._id,
        gstRate: gstMap.get(g._id) ?? 0,
        productCount: g.productCount,
    }));
    res.json(response);
});
// Update GST for a category
router.patch("/categories/gst/:name", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
    const { gstRate } = req.body;
    const name = req.params.name;
    const rateNum = Number(gstRate);
    if (Number.isNaN(rateNum) || rateNum < 0 || rateNum > 28) {
        return res.status(400).json({ message: "GST must be between 0 and 28" });
    }
    const updated = await CategoryGST_1.default.findOneAndUpdate({ name }, { name, gstRate: rateNum }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ name: updated?.name, gstRate: updated?.gstRate ?? rateNum });
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
router.put("/:id", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
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
router.delete("/:id", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
    const deleted = await Product_1.default.findByIdAndDelete(req.params.id);
    if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted" });
});
exports.default = router;
//# sourceMappingURL=product.routes.js.map