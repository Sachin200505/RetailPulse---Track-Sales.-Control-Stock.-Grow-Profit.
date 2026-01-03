"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const withDefault = (value, fallback) => (value === undefined || value === null || value === "" ? fallback : value);
exports.ENV = {
    PORT: Number(withDefault(process.env.PORT, "5000")),
    MONGO_URI: withDefault(process.env.MONGO_URI, "memory"),
    JWT_SECRET: withDefault(process.env.JWT_SECRET, "dev-secret"),
    JWT_EXPIRES_IN: withDefault(process.env.JWT_EXPIRES_IN, "7d"),
    NODE_ENV: withDefault(process.env.NODE_ENV, "development"),
    TWILIO_ACCOUNT_SID: withDefault(process.env.TWILIO_ACCOUNT_SID, ""),
    TWILIO_AUTH_TOKEN: withDefault(process.env.TWILIO_AUTH_TOKEN, ""),
    TWILIO_FROM_NUMBER: withDefault(process.env.TWILIO_FROM_NUMBER, ""),
    ALERT_PHONE: withDefault(process.env.ALERT_PHONE, ""),
    TELEGRAM_BILLING_BOT_TOKEN: withDefault(process.env.TELEGRAM_BILLING_BOT_TOKEN, ""),
    TELEGRAM_BILLING_CHAT_ID: withDefault(process.env.TELEGRAM_BILLING_CHAT_ID, ""),
};
//# sourceMappingURL=env.js.map