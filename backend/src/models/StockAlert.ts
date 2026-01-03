import mongoose, { Schema, Document } from "mongoose";

export interface IStockAlert extends Document {
  product: mongoose.Types.ObjectId;
  triggeredAt: Date;
  resolved: boolean;
  stock: number;
  threshold: number;
  smsSent: boolean;
  smsSentAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: mongoose.Types.ObjectId;
}

const StockAlertSchema: Schema<IStockAlert> = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    stock: {
      type: Number,
      required: true
    },
    threshold: {
      type: Number,
      default: 5
    },
    smsSent: {
      type: Boolean,
      default: false
    },
    smsSentAt: {
      type: Date,
    },
    triggeredAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  }
);

export default mongoose.model<IStockAlert>("StockAlert", StockAlertSchema);
