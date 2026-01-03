"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Product_1 = __importDefault(require("../models/Product"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const Customer_1 = __importDefault(require("../models/Customer"));
const audit_service_1 = require("../services/audit.service");
const stock_service_1 = require("../services/stock.service");
const sms_service_1 = require("../services/sms.service");
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
    // Trigger immediate low/out-of-stock alerts after sale
    await (0, stock_service_1.checkLowStock)();
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
    (0, audit_service_1.createAuditLog)({
        action: "billing",
        user: req.user._id.toString(),
        meta: {
            entityType: "transaction",
            entityId: transaction._id.toString(),
            newValues: {
                invoiceNumber,
                totalAmount,
                paymentMethod,
                itemsCount: items.length,
            },
            notes: `Billing completed for invoice ${invoiceNumber}`,
        },
    });
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
/**
 * @route   POST /api/transactions/:id/send-sms
 * @access  Private (owner/admin/cashier)
 */
router.post("/:id/send-sms", auth_middleware_1.protect, (0, role_middleware_1.authorize)("owner", "admin", "cashier"), async (req, res) => {
    try {
        const tx = await Transaction_1.default.findById(req.params.id).populate("customer");
        if (!tx)
            return res.status(404).json({ message: "Transaction not found" });
        const targetPhone = tx.customer?.mobile;
        if (!targetPhone) {
            return res.status(400).json({ message: "Customer phone number not available" });
        }
        const itemsPreview = tx.items
            .slice(0, 4)
            .map((i) => `${i.quantity}x ${i.productName}`)
            .join(", ");
        const moreCount = tx.items.length > 4 ? ` +${tx.items.length - 4} more` : "";
        const createdAtValue = tx.createdAt ?? tx.updatedAt ?? Date.now();
        const message = `Invoice: ${tx.invoiceNumber}\n` +
            `Amount: ₹${Number(tx.totalAmount).toFixed(2)}\n` +
            `Date: ${new Date(createdAtValue).toLocaleString("en-IN")}\n` +
            `Items: ${itemsPreview}${moreCount}\n` +
            `Payment: ${tx.paymentMethod.toUpperCase()}\n` +
            `Thank you for shopping!`;
        const sent = await (0, sms_service_1.sendSMS)(targetPhone, message);
        if (!sent)
            return res.status(500).json({ message: "Failed to send SMS" });
        res.json({ message: "Receipt sent via SMS" });
    }
    catch (error) {
        console.error("Error sending transaction SMS", error);
        res.status(500).json({ message: "Failed to send SMS" });
    }
});
// Bulk delete transactions by selection or date range (owner only)
router.post("/bulk-delete", auth_middleware_1.protect, (0, role_middleware_1.authorize)("owner"), async (req, res) => {
    const { ids, from, to } = req.body || {};
    if (Array.isArray(ids) && ids.length > 0) {
        const result = await Transaction_1.default.deleteMany({ _id: { $in: ids } });
        (0, audit_service_1.createAuditLog)({
            action: "delete",
            user: req.user._id.toString(),
            meta: {
                entityType: "transaction",
                entityId: "bulk",
                notes: `Deleted ${result.deletedCount || 0} transactions by selection`,
            },
        });
        return res.json({ deleted: result.deletedCount || 0 });
    }
    if (from && to) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        const result = await Transaction_1.default.deleteMany({
            createdAt: { $gte: start, $lte: end },
        });
        (0, audit_service_1.createAuditLog)({
            action: "delete",
            user: req.user._id.toString(),
            meta: {
                entityType: "transaction",
                entityId: "bulk-date",
                notes: `Deleted ${result.deletedCount || 0} transactions from ${start.toISOString()} to ${end.toISOString()}`,
            },
        });
        return res.json({ deleted: result.deletedCount || 0 });
    }
    return res.status(400).json({ message: "Provide ids[] or from/to date range" });
});
exports.default = router;
//# sourceMappingURL=transaction.routes.js.map