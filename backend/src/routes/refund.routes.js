"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const Refund_1 = __importDefault(require("../models/Refund"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Product_1 = __importDefault(require("../models/Product"));
const Customer_1 = __importDefault(require("../models/Customer"));
const router = express_1.default.Router();
// Create refund and reverse stock/points
router.post("/", auth_middleware_1.protect, async (req, res) => {
    const { transactionId, refundAmount, reason } = req.body;
    const tx = await Transaction_1.default.findById(transactionId);
    if (!tx)
        return res.status(404).json({ message: "Transaction not found" });
    if (tx.isRefunded)
        return res.status(400).json({ message: "Already refunded" });
    // Reverse stock
    for (const item of tx.items) {
        const product = await Product_1.default.findById(item.productId);
        if (product) {
            product.stock += item.quantity;
            await product.save();
        }
    }
    // Reverse points if customer
    let pointsReversed = 0;
    if (tx.customer) {
        const customer = await Customer_1.default.findById(tx.customer);
        if (customer) {
            pointsReversed = tx.creditPointsEarned || 0;
            customer.creditPoints = Math.max(0, customer.creditPoints - pointsReversed);
            customer.totalPurchases = Math.max(0, customer.totalPurchases - tx.totalAmount);
            await customer.save();
        }
    }
    const refund = await Refund_1.default.create({
        transaction: tx._id,
        refundAmount: refundAmount ?? tx.totalAmount,
        refundReason: reason,
        pointsReversed,
        stockReversed: true,
        processedBy: req.user?._id || null,
    });
    tx.isRefunded = true;
    tx.refundId = refund._id;
    await tx.save();
    res.status(201).json(refund);
});
router.get("/", auth_middleware_1.protect, async (_req, res) => {
    const refunds = await Refund_1.default.find().sort({ createdAt: -1 });
    res.json(refunds);
});
router.get("/transaction/:id", auth_middleware_1.protect, async (req, res) => {
    const refund = await Refund_1.default.findOne({ transaction: req.params.id });
    if (!refund)
        return res.status(404).json({ message: "Refund not found" });
    res.json(refund);
});
exports.default = router;
//# sourceMappingURL=refund.routes.js.map