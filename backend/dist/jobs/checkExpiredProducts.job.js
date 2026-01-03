"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExpiredProductsJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Product_1 = __importDefault(require("../models/Product"));
const StockAlert_1 = __importDefault(require("../models/StockAlert"));
const sms_service_1 = require("../services/sms.service");
const env_1 = require("../config/env");
const checkExpiredProductsJob = () => {
    // Run at 6:00 and 18:00 daily
    node_cron_1.default.schedule("0 6,18 * * *", async () => {
        try {
            console.log("🧹 Checking expired products");
            const now = new Date();
            const soon = new Date();
            soon.setDate(soon.getDate() + 3);
            const expired = await Product_1.default.find({ expiryDate: { $lte: now }, isActive: true });
            const expiringSoon = await Product_1.default.find({ expiryDate: { $gt: now, $lte: soon }, isActive: true });
            const alertPhone = env_1.ENV.ALERT_PHONE || "7695958854";
            if (expired.length) {
                await Product_1.default.updateMany({ _id: { $in: expired.map(p => p._id) } }, { $set: { isActive: false } });
                if (alertPhone) {
                    const names = expired.map(p => p.name).join(", ");
                    (0, sms_service_1.sendSMS)(alertPhone, `Expired products deactivated: ${names}`);
                }
                // Log alerts for dashboard/history
                for (const p of expired) {
                    const recent = await StockAlert_1.default.findOne({
                        product: p._id,
                        triggeredAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    });
                    if (recent)
                        continue;
                    await StockAlert_1.default.create({
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
                (0, sms_service_1.sendSMS)(alertPhone, `Products expiring soon: ${names}`);
                // Log alerts for dashboard/history
                for (const p of expiringSoon) {
                    const recent = await StockAlert_1.default.findOne({
                        product: p._id,
                        triggeredAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    });
                    if (recent)
                        continue;
                    await StockAlert_1.default.create({
                        product: p._id,
                        stock: p.stock ?? 0,
                        threshold: 0,
                        smsSent: !!alertPhone,
                        smsSentAt: alertPhone ? new Date() : undefined,
                    });
                }
            }
        }
        catch (error) {
            console.error("Expired product job failed", error);
        }
    });
};
exports.checkExpiredProductsJob = checkExpiredProductsJob;
//# sourceMappingURL=checkExpiredProducts.job.js.map