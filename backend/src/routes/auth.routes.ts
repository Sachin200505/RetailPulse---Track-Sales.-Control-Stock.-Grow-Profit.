import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import User from "../models/User";
import { ENV } from "../config/env";
import { protect } from "../middlewares/auth.middleware";
import { createAuditLog } from "../services/audit.service";

const router = express.Router();

/**
 * Generate JWT
 */
const JWT_SECRET: Secret = ENV.JWT_SECRET;
const DEFAULT_OWNER_EMAIL = process.env.DEFAULT_OWNER_EMAIL || "sachinsundar200505@gmail.com";
const DEFAULT_OWNER_PASSWORD = process.env.DEFAULT_OWNER_PASSWORD || "123123123";

const generateToken = (id: string) => {
  return jwt.sign(
    { id },
    JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as unknown as NonNullable<SignOptions["expiresIn"]> }
  );
};

// Ensure a default owner exists for first-time setups
const ensureDefaultOwner = async () => {
  const count = await User.countDocuments();
  if (count > 0) return;

  const hashed = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 12);
  await User.create({
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
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    await ensureDefaultOwner();

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Audit login
    createAuditLog({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   GET /api/auth/me
 * @access  Private
 */
router.get("/me", protect, async (req: any, res: Response) => {
  res.json(req.user);
});

/**
 * @route   POST /api/auth/logout
 * @access  Private
 */
router.post("/logout", protect, async (req: any, res: Response) => {
  try {
    const user = req.user;
    createAuditLog({
      action: "logout",
      user: user._id.toString(),
      meta: {
        entityType: "auth",
        entityId: user._id.toString(),
        notes: `User ${user.email || user.id} logged out`,
      },
    });
    res.json({ message: "Logged out" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
