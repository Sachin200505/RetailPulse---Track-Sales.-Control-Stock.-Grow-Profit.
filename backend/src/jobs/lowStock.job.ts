import cron from "node-cron";
import { checkLowStock } from "../services/stock.service";

export const lowStockJob = () => {
  cron.schedule("0 6,18 * * *", async () => {
    try {
      console.log("🔁 Running low stock check");
      await checkLowStock();
    } catch (error) {
      console.error("Low stock job failed", error);
    }
  });
};
