"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLowStock = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const StockAlert_1 = __importDefault(require("../models/StockAlert"));
const sms_service_1 = require("./sms.service");
const env_1 = require("../config/env");
const checkLowStock = async () => {
    const LOW_STOCK_LIMIT = 5;
    const products = await Product_1.default.find({ stock: { $lte: LOW_STOCK_LIMIT } });
    for (const product of products) {
        const exists = await StockAlert_1.default.findOne({ product: product._id });
        if (!exists) {
            const level = product.stock <= 0 ? "Out of stock" : "Low stock";
            const message = `${level}: ${product.name} (SKU ${product.sku || "N/A"}) remaining ${product.stock}`;
            let smsSent = false;
            let smsSentAt;
            const alertPhone = env_1.ENV.ALERT_PHONE || "7695958854";
            if (alertPhone) {
                smsSent = await (0, sms_service_1.sendSMS)(alertPhone, message);
                if (smsSent)
                    smsSentAt = new Date();
            }
            await StockAlert_1.default.create({
                product: product._id,
                stock: product.stock,
                threshold: LOW_STOCK_LIMIT,
                smsSent,
                smsSentAt,
            });
        }
    }
};
exports.checkLowStock = checkLowStock;
//# sourceMappingURL=stock.service.js.map