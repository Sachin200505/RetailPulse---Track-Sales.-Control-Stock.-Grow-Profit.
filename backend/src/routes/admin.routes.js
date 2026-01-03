"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const User_1 = __importDefault(require("../models/User"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const router = express_1.default.Router();
/**
 * @route   GET /api/admin/users
 * @access  Admin
 */
router.get("/users", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin"), async (_req, res) => {
    const users = await User_1.default.find().select("-password");
    res.json(users);
});
/**
 * @route   GET /api/admin/audit-logs
 * @access  Admin
 */
router.get("/audit-logs", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin"), async (_req, res) => {
    const logs = await AuditLog_1.default.find().sort({ createdAt: -1 });
    res.json(logs);
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map