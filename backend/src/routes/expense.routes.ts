import express, { Response } from "express";
import { protect, AuthRequest } from "../middlewares/auth.middleware";
import Expense from "../models/Expense";
import { createAuditLog } from "../services/audit.service";

const router = express.Router();

router.get("/", protect, async (_req, res: Response) => {
  const expenses = await Expense.find().sort({ expenseDate: -1 });
  res.json(expenses);
});

router.post("/", protect, async (req: AuthRequest, res: Response) => {
  const { category, description, amount, expenseDate, paymentMethod, vendor, receiptUrl, notes } = req.body;
  const expense = await Expense.create({
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

  createAuditLog({
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

router.put("/:id", protect, async (req: AuthRequest, res: Response) => {
  const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Expense not found" });
  res.json(updated);

  createAuditLog({
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

router.delete("/:id", protect, async (_req, res: Response) => {
  const expense = await Expense.findByIdAndDelete(_req.params.id);
  res.json({ message: "Expense deleted" });

  if (expense) {
    createAuditLog({
      action: "delete",
      user: (_req as AuthRequest).user?._id?.toString() || "system",
      meta: {
        entityType: "expense",
        entityId: expense._id.toString(),
        oldValues: { category: expense.category, amount: expense.amount },
        notes: "Expense deleted",
      },
    });
  }
});

export default router;
