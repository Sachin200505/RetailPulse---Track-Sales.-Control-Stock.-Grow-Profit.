import express, { Response } from "express";
import { protect } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import Customer from "../models/Customer";
import { generateCustomerCode } from "../utils/generateCustomerCode";
import mongoose from "mongoose";

const router = express.Router();

// List customers (used by dashboard widgets)
router.get("/", protect, async (_req, res: Response) => {
  const customers = await Customer.find().sort({ createdAt: -1 });
  res.json(customers);
});

// Search customers by mobile or name
router.get("/search", protect, async (req, res: Response) => {
  const { q } = req.query;
  const query = (q as string) || "";

  const isNumeric = /^\d+$/.test(query);
  const filter = isNumeric
    ? { mobile: { $regex: `^${query}` } }
    : { name: { $regex: query, $options: "i" } };

  const customers = await Customer.find(filter).limit(10).sort({ createdAt: -1 });
  res.json(customers);
});

// Get customer by id
router.get("/:id", protect, async (req, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid customer id" });
  }

  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  res.json(customer);
});

// Upsert by mobile
router.post("/upsert", protect, async (req: any, res: Response) => {
  const { mobile, name } = req.body;
  if (!mobile || !name) {
    return res.status(400).json({ message: "Mobile and name are required" });
  }

  let customer = await Customer.findOne({ mobile });
  if (customer) {
    customer.name = name;
    await customer.save();
    const payload = customer.toObject();
    return res.json({ ...payload, id: payload._id });
  }

  customer = await Customer.create({
    mobile,
    name,
    customerCode: generateCustomerCode(),
    creditPoints: 0,
    pointsRedeemed: 0,
    totalPurchases: 0,
    tier: "Bronze",
  });

  const payload = customer.toObject();
  res.status(201).json({ ...payload, id: payload._id });
});

// Update loyalty stats (used after transaction)
router.post(
  "/:id/loyalty",
  protect,
  authorize("owner", "admin", "staff", "cashier"),
  async (req, res: Response) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const { creditPoints, totalPurchases, tier, pointsRedeemed } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (creditPoints !== undefined) customer.creditPoints = creditPoints;
    if (totalPurchases !== undefined) customer.totalPurchases = totalPurchases;
    if (pointsRedeemed !== undefined) customer.pointsRedeemed = pointsRedeemed;
    if (tier) customer.tier = tier;
    await customer.save();

    res.json(customer);
  }
);

export default router;
