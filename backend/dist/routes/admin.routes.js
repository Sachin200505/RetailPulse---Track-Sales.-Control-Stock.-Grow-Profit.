"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const User_1 = __importDefault(require("../models/User"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const audit_service_1 = require("../services/audit.service");
const router = express_1.default.Router();
/**
 * @route   GET /api/admin/users
 * @access  Admin
 */
router.get("/users", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (_req, res) => {
    const users = await User_1.default.find().select("-password");
    res.json(users);
});
// Create user
router.post("/users", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
    }
    // Prevent multiple owners
    if (role === "owner") {
        const existingOwner = await User_1.default.findOne({ role: "owner" });
        if (existingOwner) {
            return res.status(400).json({ message: "An owner already exists" });
        }
    }
    const existing = await User_1.default.findOne({ email });
    if (existing) {
        return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const user = await User_1.default.create({
        name,
        email,
        password: hashedPassword,
        role: role || "cashier",
    });
    (0, audit_service_1.createAuditLog)({
        action: "create",
        user: req.user._id.toString(),
        meta: {
            entityType: "user",
            entityId: user._id.toString(),
            newValues: { name: user.name, email: user.email, role: user.role },
            notes: "User created",
        },
    });
    const createdAt = user.createdAt || user.get("createdAt");
    res.status(201).json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt,
    });
});
// Update role
router.patch("/users/:id/role", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
    const { role } = req.body;
    if (!role)
        return res.status(400).json({ message: "Role is required" });
    const user = await User_1.default.findById(req.params.id);
    if (!user)
        return res.status(404).json({ message: "User not found" });
    if (role === "owner") {
        const existingOwner = await User_1.default.findOne({ role: "owner", _id: { $ne: user._id } });
        if (existingOwner) {
            return res.status(400).json({ message: "Only one owner is allowed" });
        }
    }
    user.role = role;
    await user.save();
    (0, audit_service_1.createAuditLog)({
        action: "update",
        user: req.user._id.toString(),
        meta: {
            entityType: "user",
            entityId: user._id.toString(),
            newValues: { role: user.role },
            notes: "User role updated",
        },
    });
    const createdAt = user.createdAt || user.get("createdAt");
    res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt,
    });
});
// Toggle active status
router.patch("/users/:id/status", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
    const user = await User_1.default.findById(req.params.id);
    if (!user)
        return res.status(404).json({ message: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    (0, audit_service_1.createAuditLog)({
        action: "update",
        user: req.user._id.toString(),
        meta: {
            entityType: "user",
            entityId: user._id.toString(),
            newValues: { isActive: user.isActive },
            notes: "User status toggled",
        },
    });
    const createdAt = user.createdAt || user.get("createdAt");
    res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt,
    });
});
// Reset password
router.patch("/users/:id/password", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const user = await User_1.default.findById(req.params.id).select("+password");
    if (!user)
        return res.status(404).json({ message: "User not found" });
    user.password = await bcryptjs_1.default.hash(password, 10);
    await user.save();
    res.json({ message: "Password updated" });
    (0, audit_service_1.createAuditLog)({
        action: "update",
        user: req.user._id.toString(),
        meta: {
            entityType: "user",
            entityId: user._id.toString(),
            notes: "User password reset",
        },
    });
});
// Update basic profile (name/email)
router.patch("/users/:id", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
    const { name, email } = req.body;
    if (!name && !email) {
        return res.status(400).json({ message: "Nothing to update" });
    }
    const user = await User_1.default.findById(req.params.id);
    if (!user)
        return res.status(404).json({ message: "User not found" });
    if (email && email !== user.email) {
        const exists = await User_1.default.findOne({ email });
        if (exists && exists.id !== user.id) {
            return res.status(400).json({ message: "Email already in use" });
        }
        user.email = email;
    }
    if (name) {
        user.name = name;
    }
    await user.save();
    (0, audit_service_1.createAuditLog)({
        action: "update",
        user: req.user._id.toString(),
        meta: {
            entityType: "user",
            entityId: user._id.toString(),
            newValues: { name: user.name, email: user.email },
            notes: "User profile updated",
        },
    });
    const createdAt = user.createdAt || user.get("createdAt");
    res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt,
    });
});
// Delete user
router.delete("/users/:id", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (req, res) => {
    const user = await User_1.default.findByIdAndDelete(req.params.id);
    if (!user)
        return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
    (0, audit_service_1.createAuditLog)({
        action: "delete",
        user: req.user._id.toString(),
        meta: {
            entityType: "user",
            entityId: user._id.toString(),
            oldValues: { email: user.email, role: user.role },
            notes: "User deleted",
        },
    });
});
/**
 * @route   GET /api/admin/audit-logs
 * @access  Admin
 */
router.get("/audit-logs", auth_middleware_1.protect, (0, role_middleware_1.authorize)("admin", "owner"), async (_req, res) => {
    const logs = await AuditLog_1.default.find()
        .populate("user", "name role email")
        .sort({ createdAt: -1 });
    const formatted = logs.map((log) => ({
        id: log._id,
        user_id: log.user?._id || null,
        user_name: log.user?.name || null,
        user_role: log.user?.role || null,
        action_type: log.action,
        entity_type: log.metadata?.entityType || null,
        entity_id: log.metadata?.entityId || null,
        old_values: log.metadata?.oldValues || null,
        new_values: log.metadata?.newValues || null,
        notes: log.metadata?.notes || null,
        created_at: log.createdAt,
    }));
    res.json(formatted);
});
// Clear all audit logs
router.delete("/audit-logs", auth_middleware_1.protect, (0, role_middleware_1.authorize)("owner"), async (_req, res) => {
    const result = await AuditLog_1.default.deleteMany({});
    res.json({ message: "Audit logs cleared", deleted: result.deletedCount || 0 });
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map