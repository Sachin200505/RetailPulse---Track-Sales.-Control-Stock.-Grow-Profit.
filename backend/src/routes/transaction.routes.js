"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Product_1 = __importDefault(require("../models/Product"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const Customer_1 = __importDefault(require("../models/Customer"));
const router = express_1.default.Router();
/**
 * @route   POST /api/transactions
 * @access  Private
 */
router.post("/", auth_middleware_1.protect, async (req, res) => {
    const { invoiceNumber, items, customerId, subtotal, gstAmount, discount, totalAmount, paymentMethod, paymentStatus, creditPointsEarned, } = req.body;
    if (!items || items.length === 0) {
        return res.status(400).json({ message: "No items provided" });
    }
    if (!invoiceNumber) {
        return res.status(400).json({ message: "Missing invoice number" });
    }
    // Validate and adjust stock
    for (const item of items) {
        const product = await Product_1.default.findById(item.productId);
        if (!product || product.stock < item.quantity) {
            return res.status(400).json({
                message: `Insufficient stock for product ${item.productId}`,
            });
        }
    }
    for (const item of items) {
        const product = await Product_1.default.findById(item.productId);
        if (!product)
            continue;
        product.stock -= item.quantity;
        await product.save();
    }
    const transaction = await Transaction_1.default.create({
        invoiceNumber,
        items,
        customer: customerId || null,
        subtotal,
        gstAmount,
        discount,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentStatus || "completed",
        creditPointsEarned: creditPointsEarned || 0,
        createdBy: req.user._id,
    });
    // Update customer loyalty metrics if applicable
    if (customerId) {
        const customer = await Customer_1.default.findById(customerId);
        if (customer) {
            const newTotal = Number(customer.totalPurchases) + Number(totalAmount || 0);
            customer.totalPurchases = newTotal;
            customer.creditPoints += creditPointsEarned || 0;
            customer.tier = newTotal >= 50000 ? "Gold" : newTotal >= 20000 ? "Silver" : "Bronze";
            await customer.save();
        }
    }
    res.status(201).json(transaction);
});
/**
 * @route   GET /api/transactions
 * @access  Private
 */
router.get("/", auth_middleware_1.protect, async (_req, res) => {
    const transactions = await Transaction_1.default.find()
        .populate("customer")
        .populate("createdBy", "name");
    res.json(transactions);
});
router.get("/:id", auth_middleware_1.protect, async (req, res) => {
    const tx = await Transaction_1.default.findById(req.params.id)
        .populate("customer")
        .populate("createdBy", "name");
    if (!tx)
        return res.status(404).json({ message: "Transaction not found" });
    res.json(tx);
});
exports.default = router;
//# sourceMappingURL=transaction.routes.js.map