"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const role_middleware_1 = require("../middlewares/role.middleware");
const Customer_1 = __importDefault(require("../models/Customer"));
const generateCustomerCode_1 = require("../utils/generateCustomerCode");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// List customers (used by dashboard widgets)
router.get("/", auth_middleware_1.protect, async (_req, res) => {
    const customers = await Customer_1.default.find().sort({ createdAt: -1 });
    res.json(customers);
});
// Search customers by mobile or name
router.get("/search", auth_middleware_1.protect, async (req, res) => {
    const { q } = req.query;
    const query = q || "";
    const isNumeric = /^\d+$/.test(query);
    const filter = isNumeric
        ? { mobile: { $regex: `^${query}` } }
        : { name: { $regex: query, $options: "i" } };
    const customers = await Customer_1.default.find(filter).limit(10).sort({ createdAt: -1 });
    res.json(customers);
});
// Get customer by id
router.get("/:id", auth_middleware_1.protect, async (req, res) => {
    if (!mongoose_1.default.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid customer id" });
    }
    const customer = await Customer_1.default.findById(req.params.id);
    if (!customer)
        return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
});
// Upsert by mobile
router.post("/upsert", auth_middleware_1.protect, async (req, res) => {
    const { mobile, name } = req.body;
    if (!mobile || !name) {
        return res.status(400).json({ message: "Mobile and name are required" });
    }
    let customer = await Customer_1.default.findOne({ mobile });
    if (customer) {
        customer.name = name;
        await customer.save();
        const payload = customer.toObject();
        return res.json({ ...payload, id: payload._id });
    }
    customer = await Customer_1.default.create({
        mobile,
        name,
        customerCode: (0, generateCustomerCode_1.generateCustomerCode)(),
        creditPoints: 0,
        pointsRedeemed: 0,
        totalPurchases: 0,
        tier: "Bronze",
    });
    const payload = customer.toObject();
    res.status(201).json({ ...payload, id: payload._id });
});
// Update loyalty stats (used after transaction)
router.post("/:id/loyalty", auth_middleware_1.protect, (0, role_middleware_1.authorize)("owner", "admin", "staff", "cashier"), async (req, res) => {
    if (!mongoose_1.default.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid customer id" });
    }
    const { creditPoints, totalPurchases, tier, pointsRedeemed } = req.body;
    const customer = await Customer_1.default.findById(req.params.id);
    if (!customer)
        return res.status(404).json({ message: "Customer not found" });
    if (creditPoints !== undefined)
        customer.creditPoints = creditPoints;
    if (totalPurchases !== undefined)
        customer.totalPurchases = totalPurchases;
    if (pointsRedeemed !== undefined)
        customer.pointsRedeemed = pointsRedeemed;
    if (tier)
        customer.tier = tier;
    await customer.save();
    res.json(customer);
});
exports.default = router;
//# sourceMappingURL=customer.routes.js.map