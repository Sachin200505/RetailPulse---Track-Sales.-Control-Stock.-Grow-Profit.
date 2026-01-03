"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLowStock = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const StockAlert_1 = __importDefault(require("../models/StockAlert"));
const checkLowStock = async () => {
    const LOW_STOCK_LIMIT = 5;
    const products = await Product_1.default.find({ stock: { $lte: LOW_STOCK_LIMIT } });
    for (const product of products) {
        const exists = await StockAlert_1.default.findOne({ product: product._id });
        if (!exists) {
            await StockAlert_1.default.create({
                product: product._id,
                stock: product.stock,
            });
        }
    }
};
exports.checkLowStock = checkLowStock;
//# sourceMappingURL=stock.service.js.map