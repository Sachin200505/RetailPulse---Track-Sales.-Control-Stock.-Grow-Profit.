"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const transaction_routes_1 = __importDefault(require("./routes/transaction.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const sms_routes_1 = __importDefault(require("./routes/sms.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const expense_routes_1 = __importDefault(require("./routes/expense.routes"));
const refund_routes_1 = __importDefault(require("./routes/refund.routes"));
const alerts_routes_1 = __importDefault(require("./routes/alerts.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ["http://localhost:8081", "http://127.0.0.1:8081"],
    credentials: true,
}));
app.use(express_1.default.json());
app.use("/api/auth", auth_routes_1.default);
app.use("/api/products", product_routes_1.default);
app.use("/api/transactions", transaction_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/sms", sms_routes_1.default);
app.use("/api/customers", customer_routes_1.default);
app.use("/api/expenses", expense_routes_1.default);
app.use("/api/refunds", refund_routes_1.default);
app.use("/api", alerts_routes_1.default);
app.get("/", (_req, res) => {
    res.send("Retail Ease API running");
});
exports.default = app;
//# sourceMappingURL=app.js.map