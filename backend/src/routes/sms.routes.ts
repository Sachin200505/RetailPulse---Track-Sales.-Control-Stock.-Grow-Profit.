import express, { Request, Response } from "express";
import { protect } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";
import { sendSMS } from "../services/sms.service";

const router = express.Router();

/**
 * @route   POST /api/sms/send
 * @access  Admin
 */
router.post(
  "/send",
  protect,
  authorize("admin"),
  async (req: Request, res: Response) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ message: "Phone and message required" });
    }

    await sendSMS(phone, message);
    res.json({ message: "SMS sent successfully" });
  }
);

export default router;
