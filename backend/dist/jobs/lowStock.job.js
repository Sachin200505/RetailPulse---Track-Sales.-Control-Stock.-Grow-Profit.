"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lowStockJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const stock_service_1 = require("../services/stock.service");
const lowStockJob = () => {
    node_cron_1.default.schedule("0 6,18 * * *", async () => {
        try {
            console.log("🔁 Running low stock check");
            await (0, stock_service_1.checkLowStock)();
        }
        catch (error) {
            console.error("Low stock job failed", error);
        }
    });
};
exports.lowStockJob = lowStockJob;
//# sourceMappingURL=lowStock.job.js.map