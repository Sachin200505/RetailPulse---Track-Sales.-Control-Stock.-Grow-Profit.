"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCustomerCode = void 0;
/**
 * Generates a readable, mostly-unique customer code.
 * Format: CUST-YYYYMMDD-XXXX
 * Example: CUST-20260102-4837
 */
const generateCustomerCode = () => {
    const now = new Date();
    const datePart = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `CUST-${datePart}-${randomPart}`;
};
exports.generateCustomerCode = generateCustomerCode;
exports.default = exports.generateCustomerCode;
//# sourceMappingURL=generateCustomerCode.js.map