"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const createAuditLog = async ({ action, user, meta, }) => {
    try {
        await AuditLog_1.default.create({
            action,
            user,
            meta,
        });
    }
    catch (error) {
        console.error("Audit log failed", error);
    }
};
exports.createAuditLog = createAuditLog;
//# sourceMappingURL=audit.service.js.map