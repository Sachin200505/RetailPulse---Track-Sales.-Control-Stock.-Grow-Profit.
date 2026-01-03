import express, { Response } from "express";
import { protect, AuthRequest } from "../middlewares/auth.middleware";
import Refund from "../models/Refund";
import Transaction from "../models/Transaction";
import Product from "../models/Product";
import Customer from "../models/Customer";
import { createAuditLog } from "../services/audit.service";

const router = express.Router();

// Create refund and reverse stock/points
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  const { transactionId, refundAmount, reason } = req.body;
  const tx = await Transaction.findById(transactionId);
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (tx.isRefunded) return res.status(400).json({ message: "Already refunded" });

  // Reverse stock
  for (const item of tx.items) {
    const product = await Product.findById(item.productId);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }
  }

  // Reverse points if customer
  let pointsReversed = 0;
  if (tx.customer) {
    const customer = await Customer.findById(tx.customer);
    if (customer) {
      pointsReversed = tx.creditPointsEarned || 0;
      customer.creditPoints = Math.max(0, customer.creditPoints - pointsReversed);
      customer.totalPurchases = Math.max(0, customer.totalPurchases - tx.totalAmount);
      await customer.save();
    }
  }

  const refund = await Refund.create({
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

  createAuditLog({
    action: "refund",
    user: (req.user?._id || "system").toString(),
    meta: {
      entityType: "refund",
      entityId: refund._id.toString(),
      oldValues: { transactionId: tx._id.toString() },
      newValues: {
        refundAmount: refund.refundAmount,
        pointsReversed,
      },
      notes: `Refund processed for invoice ${tx.invoiceNumber}`,
    },
  });
});

router.get("/", protect, async (_req, res: Response) => {
  const refunds = await Refund.find().sort({ createdAt: -1 });
  res.json(refunds);
});

router.get("/transaction/:id", protect, async (req, res: Response) => {
  const refund = await Refund.findOne({ transaction: req.params.id });
  if (!refund) return res.status(404).json({ message: "Refund not found" });
  res.json(refund);
});

export default router;
