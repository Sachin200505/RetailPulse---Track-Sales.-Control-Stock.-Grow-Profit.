import app from "./app";
import { ENV } from "./config/env";
import { connectDB } from "./config/db";
import { lowStockJob } from "./jobs/lowStock.job";
import { checkExpiredProductsJob } from "./jobs/checkExpiredProducts.job";

const startServer = async () => {
  await connectDB();

  lowStockJob();
  checkExpiredProductsJob();

  app.listen(ENV.PORT, () => {
    console.log(`🚀 Server running on port ${ENV.PORT}`);
  });
};

startServer();
