"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const Expense_1 = __importDefault(require("../models/Expense"));
const audit_service_1 = require("../services/audit.service");
const router = express_1.default.Router();
router.get("/", auth_middleware_1.protect, async (_req, res) => {
    const expenses = await Expense_1.default.find().sort({ expenseDate: -1 });
    res.json(expenses);
});
router.post("/", auth_middleware_1.protect, async (req, res) => {
    const { category, description, amount, expenseDate, paymentMethod, vendor, receiptUrl, notes } = req.body;
    const expense = await Expense_1.default.create({
        category,
        description,
        amount,
        expenseDate,
        paymentMethod,
        vendor,
        receiptUrl,
        notes,
        createdBy: req.user?._id,
    });
    res.status(201).json(expense);
    (0, audit_service_1.createAuditLog)({
        action: "create",
        user: (req.user?._id || "system").toString(),
        meta: {
            entityType: "expense",
            entityId: expense._id.toString(),
            newValues: { category, amount, paymentMethod, expenseDate },
            notes: description || "Expense added",
        },
    });
});
router.put("/:id", auth_middleware_1.protect, async (req, res) => {
    const updated = await Expense_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated)
        return res.status(404).json({ message: "Expense not found" });
    res.json(updated);
    (0, audit_service_1.createAuditLog)({
        action: "update",
        user: (req.user?._id || "system").toString(),
        meta: {
            entityType: "expense",
            entityId: updated._id.toString(),
            newValues: {
                category: updated.category,
                amount: updated.amount,
                paymentMethod: updated.paymentMethod,
                expenseDate: updated.expenseDate,
            },
            notes: "Expense updated",
        },
    });
});
router.delete("/:id", auth_middleware_1.protect, async (_req, res) => {
    const expense = await Expense_1.default.findByIdAndDelete(_req.params.id);
    res.json({ message: "Expense deleted" });
    if (expense) {
        (0, audit_service_1.createAuditLog)({
            action: "delete",
            user: _req.user?._id?.toString() || "system",
            meta: {
                entityType: "expense",
                entityId: expense._id.toString(),
                oldValues: { category: expense.category, amount: expense.amount },
                notes: "Expense deleted",
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=expense.routes.js.map