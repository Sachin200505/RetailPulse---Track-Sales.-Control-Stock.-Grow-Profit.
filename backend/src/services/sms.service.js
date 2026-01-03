"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = void 0;
const sendSMS = async (phone, message) => {
    try {
        // TODO: Integrate real SMS provider here
        console.log(`📨 SMS sent to ${phone}: ${message}`);
        return true;
    }
    catch (error) {
        console.error("SMS sending failed", error);
        throw new Error("SMS service failed");
    }
};
exports.sendSMS = sendSMS;
//# sourceMappingURL=sms.service.js.map