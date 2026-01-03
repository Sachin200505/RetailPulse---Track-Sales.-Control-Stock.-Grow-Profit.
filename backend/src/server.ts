import app from "./app";
import { ENV } from "./config/env";
import { connectDB } from "./config/db";
import { lowStockJob } from "./jobs/lowStock.job";
import { checkExpiredProductsJob } from "./jobs/checkExpiredProducts.job";

const startServer = async () => {
  await connectDB();

  lowStockJob();
  checkExpiredProductsJob();

  const port = Number(process.env.PORT) || ENV.PORT || 10000;

  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${port}`);
  });
};

startServer();
