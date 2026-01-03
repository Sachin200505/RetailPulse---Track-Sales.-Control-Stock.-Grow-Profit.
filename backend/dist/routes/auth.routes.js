"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const env_1 = require("../config/env");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const audit_service_1 = require("../services/audit.service");
const router = express_1.default.Router();
/**
 * Generate JWT
 */
const JWT_SECRET = env_1.ENV.JWT_SECRET;
const DEFAULT_OWNER_EMAIL = process.env.DEFAULT_OWNER_EMAIL || "sachinsundar200505@gmail.com";
const DEFAULT_OWNER_PASSWORD = process.env.DEFAULT_OWNER_PASSWORD || "123123123";
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, JWT_SECRET, { expiresIn: env_1.ENV.JWT_EXPIRES_IN });
};
// Ensure a default owner exists for first-time setups
const ensureDefaultOwner = async () => {
    const count = await User_1.default.countDocuments();
    if (count > 0)
        return;
    const hashed = await bcryptjs_1.default.hash(DEFAULT_OWNER_PASSWORD, 12);
    await User_1.default.create({
        name: "Owner",
        email: DEFAULT_OWNER_EMAIL,
        password: hashed,
        role: "owner",
        isActive: true,
    });
};
/**
 * @route   POST /api/auth/register
 * @access  Public (use only once or restrict later)
 */
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await User_1.default.create({
            name,
            email,
            password: hashedPassword,
            role: role || "staff",
        });
        res.status(201).json({
            message: "User registered successfully",
            token: generateToken(user._id.toString()),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
/**
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }
        await ensureDefaultOwner();
        const user = await User_1.default.findOne({ email }).select("+password");
        if (!user || !user.isActive) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Audit login
        (0, audit_service_1.createAuditLog)({
            action: "login",
            user: user._id.toString(),
            meta: {
                entityType: "auth",
                entityId: user._id.toString(),
                notes: `User ${user.email} logged in`,
            },
        });
        res.json({
            token: generateToken(user._id.toString()),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
/**
 * @route   GET /api/auth/me
 * @access  Private
 */
router.get("/me", auth_middleware_1.protect, async (req, res) => {
    res.json(req.user);
});
/**
 * @route   POST /api/auth/logout
 * @access  Private
 */
router.post("/logout", auth_middleware_1.protect, async (req, res) => {
    try {
        const user = req.user;
        (0, audit_service_1.createAuditLog)({
            action: "logout",
            user: user._id.toString(),
            meta: {
                entityType: "auth",
                entityId: user._id.toString(),
                notes: `User ${user.email || user.id} logged out`,
            },
        });
        res.json({ message: "Logged out" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map