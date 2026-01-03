import cron from "node-cron";
import Product from "../models/Product";
import StockAlert from "../models/StockAlert";
import { sendSMS } from "../services/sms.service";
import { ENV } from "../config/env";

export const checkExpiredProductsJob = () => {
  // Run at 6:00 and 18:00 daily
  cron.schedule("0 6,18 * * *", async () => {
    try {
      console.log("🧹 Checking expired products");

      const now = new Date();
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);

      const expired = await Product.find({ expiryDate: { $lte: now }, isActive: true });
      const expiringSoon = await Product.find({ expiryDate: { $gt: now, $lte: soon }, isActive: true });

      const alertPhone = ENV.ALERT_PHONE || "7695958854";

      if (expired.length) {
        await Product.updateMany(
          { _id: { $in: expired.map(p => p._id) } },
          { $set: { isActive: false } }
        );

        if (alertPhone) {
          const names = expired.map(p => p.name).join(", ");
          sendSMS(alertPhone, `Expired products deactivated: ${names}`);
        }

        // Log alerts for dashboard/history
        for (const p of expired) {
          const recent = await StockAlert.findOne({
            product: p._id,
            triggeredAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          });
          if (recent) continue;
          await StockAlert.create({
            product: p._id,
            stock: p.stock ?? 0,
            threshold: 0,
            smsSent: !!alertPhone,
            smsSentAt: alertPhone ? new Date() : undefined,
          });
        }
      }

      if (expiringSoon.length && alertPhone) {
        const names = expiringSoon
          .map(p => {
            const date = p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0, 10) : "unknown";
            return `${p.name} (${date})`;
          })
          .join(", ");
        sendSMS(alertPhone, `Products expiring soon: ${names}`);

        // Log alerts for dashboard/history
        for (const p of expiringSoon) {
          const recent = await StockAlert.findOne({
            product: p._id,
            triggeredAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          });
          if (recent) continue;
          await StockAlert.create({
            product: p._id,
            stock: p.stock ?? 0,
            threshold: 0,
            smsSent: !!alertPhone,
            smsSentAt: alertPhone ? new Date() : undefined,
          });
        }
      }
    } catch (error) {
      console.error("Expired product job failed", error);
    }
  });
};
