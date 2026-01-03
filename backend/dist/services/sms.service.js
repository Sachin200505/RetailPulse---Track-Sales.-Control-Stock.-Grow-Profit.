"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = void 0;
const twilio_1 = __importDefault(require("twilio"));
const env_1 = require("../config/env");
const normalizeNumber = (value) => {
    if (!value)
        return null;
    const base = value.split("#")[0] || "";
    const trimmed = base.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (trimmed.startsWith("+"))
        return trimmed;
    if (digits.length === 10)
        return `+91${digits}`; // assume local 10-digit
    if (digits.length > 0)
        return `+${digits}`;
    return null;
};
const fromNumber = normalizeNumber(env_1.ENV.TWILIO_FROM_NUMBER);
const hasTwilioConfig = !!env_1.ENV.TWILIO_ACCOUNT_SID && !!env_1.ENV.TWILIO_AUTH_TOKEN && !!fromNumber;
const client = hasTwilioConfig
    ? (0, twilio_1.default)(env_1.ENV.TWILIO_ACCOUNT_SID, env_1.ENV.TWILIO_AUTH_TOKEN)
    : null;
const sendSMS = async (phone, message) => {
    const toNumber = normalizeNumber(phone);
    if (!toNumber) {
        console.warn("SMS skipped: missing or invalid phone number");
        return false;
    }
    if (!hasTwilioConfig || !client) {
        console.warn("SMS skipped: Twilio config missing");
        return false;
    }
    try {
        await client.messages.create({
            to: toNumber,
            from: fromNumber,
            body: message,
        });
        console.log(`📨 SMS sent to ${toNumber}`);
        return true;
    }
    catch (error) {
        console.error("SMS sending failed", error);
        return false;
    }
};
exports.sendSMS = sendSMS;
//# sourceMappingURL=sms.service.js.map