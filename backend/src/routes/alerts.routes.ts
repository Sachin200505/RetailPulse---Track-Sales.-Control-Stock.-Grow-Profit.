import express from "express";
import { protect, AuthRequest } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import StockAlert from "../models/StockAlert";

const router = express.Router();

// List stock alerts
router.get("/stock-alerts", protect, authorize("owner", "admin"), async (_req, res) => {
  try {
    const alerts = await StockAlert.find()
      .populate("product", "name sku category")
      .sort({ triggeredAt: -1 });

    const mapped = alerts.map((a: any) => {
      const isExpiry = a.threshold === 0;
      const type = isExpiry ? "expiry" : a.stock <= 0 ? "out_of_stock" : "low_stock";
      return {
        id: a._id,
        product_id: a.product?._id || null,
        alert_type: type,
        stock_level: a.stock,
        threshold: a.threshold,
        sms_sent: !!a.smsSent,
        sms_sent_at: a.smsSentAt || null,
        acknowledged: !!a.acknowledged,
        acknowledged_at: a.acknowledgedAt || null,
        created_at: a.triggeredAt,
        product: a.product
          ? { name: a.product.name, sku: a.product.sku, category: a.product.category }
          : undefined,
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Error fetching stock alerts", error);
    res.status(500).json({ message: "Failed to fetch stock alerts" });
  }
});

// Acknowledge alert
router.post("/stock-alerts/:id/acknowledge", protect, authorize("owner", "admin"), async (req: AuthRequest, res) => {
  try {
    const alert = await StockAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: "Alert not found" });

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user?._id;
    await alert.save();

    res.json({ message: "Alert acknowledged" });
  } catch (error) {
    console.error("Error acknowledging alert", error);
    res.status(500).json({ message: "Failed to acknowledge alert" });
  }
});

export default router;
