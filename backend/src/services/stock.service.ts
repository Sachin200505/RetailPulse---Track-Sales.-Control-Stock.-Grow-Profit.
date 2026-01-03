import Product from "../models/Product";
import StockAlert from "../models/StockAlert";
import { sendSMS } from "./sms.service";
import { ENV } from "../config/env";

export const checkLowStock = async () => {
  const LOW_STOCK_LIMIT = 5;

  const products = await Product.find({ stock: { $lte: LOW_STOCK_LIMIT } });

  for (const product of products) {
    const exists = await StockAlert.findOne({ product: product._id });
    if (!exists) {
      const level = product.stock <= 0 ? "Out of stock" : "Low stock";
      const message = `${level}: ${product.name} (SKU ${product.sku || "N/A"}) remaining ${product.stock}`;
      let smsSent = false;
      let smsSentAt: Date | undefined;

      const alertPhone = ENV.ALERT_PHONE || "7695958854";

      if (alertPhone) {
        smsSent = await sendSMS(alertPhone, message);
        if (smsSent) smsSentAt = new Date();
      }

      await StockAlert.create({
        product: product._id,
        stock: product.stock,
        threshold: LOW_STOCK_LIMIT,
        smsSent,
        smsSentAt,
      });
    }
  }
};
