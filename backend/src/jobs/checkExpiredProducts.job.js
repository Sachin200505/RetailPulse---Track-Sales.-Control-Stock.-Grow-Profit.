"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExpiredProductsJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Product_1 = __importDefault(require("../models/Product"));
const checkExpiredProductsJob = () => {
    node_cron_1.default.schedule("0 0 * * *", async () => {
        try {
            console.log("🧹 Checking expired products");
            await Product_1.default.updateMany({ expiryDate: { $lte: new Date() } }, { $set: { isActive: false } });
        }
        catch (error) {
            console.error("Expired product job failed", error);
        }
    });
};
exports.checkExpiredProductsJob = checkExpiredProductsJob;
//# sourceMappingURL=checkExpiredProducts.job.js.map