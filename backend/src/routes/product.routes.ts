import express, { Request, Response } from "express";
import Product from "../models/Product";
import { protect } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import CategoryGST from "../models/CategoryGST";

const router = express.Router();

/**
 * @route   POST /api/products
 * @access  Admin
 */
router.post(
  "/",
  protect,
  authorize("admin", "owner"),
  async (req: any, res: Response) => {
    try {
      const product = await Product.create({
        ...req.body,
        createdBy: req.user?._id,
      });
      res.status(201).json(product);
    } catch (err) {
      res.status(400).json({ message: "Product creation failed" });
    }
  }
);

/**
 * @route   GET /api/products
 * @access  Private
 */
router.get("/", protect, async (req, res) => {
  const { search } = req.query;
  const filter = search
    ? {
        $or: [
          { name: { $regex: search as string, $options: "i" } },
          { category: { $regex: search as string, $options: "i" } },
          { sku: { $regex: search as string, $options: "i" } },
        ],
      }
    : {};

  const products = await Product.find(filter as any).sort({ createdAt: -1 });
  res.json(products);
});

// Get categories with GST and counts
router.get("/categories/gst", protect, async (_req, res) => {
  const grouped = await Product.aggregate([
    { $group: { _id: "$category", productCount: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const categoryNames = grouped.map((g: any) => g._id).filter(Boolean);
  const gstDocs = await CategoryGST.find({ name: { $in: categoryNames } });
  const gstMap = new Map(gstDocs.map((doc) => [doc.name, doc.gstRate]));

  const response = grouped.map((g: any) => ({
    name: g._id,
    gstRate: gstMap.get(g._id) ?? 0,
    productCount: g.productCount,
  }));

  res.json(response);
});

// Update GST for a category
router.patch(
  "/categories/gst/:name",
  protect,
  authorize("admin", "owner"),
  async (req, res) => {
    const { gstRate } = req.body;
    const name = req.params.name;

    const rateNum = Number(gstRate);
    if (Number.isNaN(rateNum) || rateNum < 0 || rateNum > 28) {
      return res.status(400).json({ message: "GST must be between 0 and 28" });
    }

    const updated = await CategoryGST.findOneAndUpdate(
      { name },
      { name, gstRate: rateNum },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ name: updated?.name, gstRate: updated?.gstRate ?? rateNum });
  }
);

router.get("/:id", protect, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

/**
 * @route   PUT /api/products/:id
 * @access  Admin
 */
router.put(
  "/:id",
  protect,
  authorize("admin", "owner"),
  async (req: Request, res: Response) => {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updated);
  }
);

/**
 * @route   DELETE /api/products/:id
 * @access  Admin
 */
router.delete(
  "/:id",
  protect,
  authorize("admin", "owner"),
  async (req: Request, res: Response) => {
    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted" });
  }
);

export default router;
