"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const lowStock_job_1 = require("./jobs/lowStock.job");
const checkExpiredProducts_job_1 = require("./jobs/checkExpiredProducts.job");
const startServer = async () => {
    await (0, db_1.connectDB)();
    (0, lowStock_job_1.lowStockJob)();
    (0, checkExpiredProducts_job_1.checkExpiredProductsJob)();
    app_1.default.listen(env_1.ENV.PORT, () => {
        console.log(`🚀 Server running on port ${env_1.ENV.PORT}`);
    });
};
startServer();
//# sourceMappingURL=server.js.map