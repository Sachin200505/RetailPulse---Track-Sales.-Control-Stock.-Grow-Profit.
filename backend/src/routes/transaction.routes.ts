import express, { Response } from "express";
import Transaction from "../models/Transaction";
import Product from "../models/Product";
import { protect, AuthRequest } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import Customer from "../models/Customer";
import { createAuditLog } from "../services/audit.service";
import { checkLowStock } from "../services/stock.service";
import { sendSMS } from "../services/sms.service";

const router = express.Router();

/**
 * @route   POST /api/transactions
 * @access  Private
 */
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  const {
    invoiceNumber,
    items,
    customerId,
    subtotal,
    gstAmount,
    discount,
    totalAmount,
    paymentMethod,
    paymentStatus,
    creditPointsEarned,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "No items provided" });
  }

  if (!invoiceNumber) {
    return res.status(400).json({ message: "Missing invoice number" });
  }

  // Validate and adjust stock
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || product.stock < item.quantity) {
      return res.status(400).json({
        message: `Insufficient stock for product ${item.productId}`,
      });
    }
  }

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;
    product.stock -= item.quantity;
    await product.save();
  }

  const transaction = await Transaction.create({
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
  await checkLowStock();

  // Update customer loyalty metrics if applicable
  if (customerId) {
    const customer = await Customer.findById(customerId);
    if (customer) {
      const newTotal = Number(customer.totalPurchases) + Number(totalAmount || 0);
      customer.totalPurchases = newTotal;
      customer.creditPoints += creditPointsEarned || 0;
      customer.tier = newTotal >= 50000 ? "Gold" : newTotal >= 20000 ? "Silver" : "Bronze";
      await customer.save();
    }
  }

  res.status(201).json(transaction);

  createAuditLog({
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
router.get("/", protect, async (_req, res) => {
  const transactions = await Transaction.find()
    .populate("customer")
    .populate("createdBy", "name");

  res.json(transactions);
});

router.get("/:id", protect, async (req, res) => {
  const tx = await Transaction.findById(req.params.id)
    .populate("customer")
    .populate("createdBy", "name");
  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  res.json(tx);
});

/**
 * @route   POST /api/transactions/:id/send-sms
 * @access  Private (owner/admin/cashier)
 */
router.post(
  "/:id/send-sms",
  protect,
  authorize("owner", "admin", "cashier"),
  async (req: AuthRequest, res) => {
    try {
      const tx = await Transaction.findById(req.params.id).populate("customer");
      if (!tx) return res.status(404).json({ message: "Transaction not found" });

      const targetPhone = (tx.customer as any)?.mobile;
      if (!targetPhone) {
        return res.status(400).json({ message: "Customer phone number not available" });
      }

      const itemsPreview = tx.items
        .slice(0, 4)
        .map((i) => `${i.quantity}x ${i.productName}`)
        .join(", ");
      const moreCount = tx.items.length > 4 ? ` +${tx.items.length - 4} more` : "";

      const createdAtValue = tx.createdAt ?? tx.updatedAt ?? Date.now();

      const message =
        `Invoice: ${tx.invoiceNumber}\n` +
        `Amount: ₹${Number(tx.totalAmount).toFixed(2)}\n` +
        `Date: ${new Date(createdAtValue).toLocaleString("en-IN")}\n` +
        `Items: ${itemsPreview}${moreCount}\n` +
        `Payment: ${tx.paymentMethod.toUpperCase()}\n` +
        `Thank you for shopping!`;

      const sent = await sendSMS(targetPhone, message);
      if (!sent) return res.status(500).json({ message: "Failed to send SMS" });

      res.json({ message: "Receipt sent via SMS" });
    } catch (error) {
      console.error("Error sending transaction SMS", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  }
);

// Bulk delete transactions by selection or date range (owner only)
router.post(
  "/bulk-delete",
  protect,
  authorize("owner"),
  async (req: AuthRequest, res: Response) => {
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Provide ids[] to delete" });
    }

    const result = await Transaction.deleteMany({ _id: { $in: ids } });

    createAuditLog({
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
);

export default router;
