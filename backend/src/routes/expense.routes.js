"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const Expense_1 = __importDefault(require("../models/Expense"));
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
});
router.put("/:id", auth_middleware_1.protect, async (req, res) => {
    const updated = await Expense_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated)
        return res.status(404).json({ message: "Expense not found" });
    res.json(updated);
});
router.delete("/:id", auth_middleware_1.protect, async (_req, res) => {
    await Expense_1.default.findByIdAndDelete(_req.params.id);
    res.json({ message: "Expense deleted" });
});
exports.default = router;
//# sourceMappingURL=expense.routes.js.map