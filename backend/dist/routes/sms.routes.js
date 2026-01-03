"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const sms_service_1 = require("../services/sms.service");
const router = express_1.default.Router();
/**
 * @route   POST /api/sms/send
 * @access  Admin
 */
router.post("/send", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin"), async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ message: "Phone and message required" });
    }
    await (0, sms_service_1.sendSMS)(phone, message);
    res.json({ message: "SMS sent successfully" });
});
exports.default = router;
//# sourceMappingURL=sms.routes.js.map