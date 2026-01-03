import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import transactionRoutes from "./routes/transaction.routes";
import adminRoutes from "./routes/admin.routes";
import smsRoutes from "./routes/sms.routes";
import customerRoutes from "./routes/customer.routes";
import expenseRoutes from "./routes/expense.routes";
import refundRoutes from "./routes/refund.routes";
import alertsRoutes from "./routes/alerts.routes";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "https://retail-pulse-track-sales-control-st.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api", alertsRoutes);

app.get("/", (_req, res) => {
  res.send("Retail Ease API running");
});

export default app;
