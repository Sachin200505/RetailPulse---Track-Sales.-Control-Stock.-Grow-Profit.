import mongoose, { Schema, Document } from "mongoose";

export interface IRefund extends Document {
  transaction: mongoose.Types.ObjectId;
  refundAmount: number;
  refundReason: string;
  pointsReversed: number;
  stockReversed: boolean;
  processedBy?: mongoose.Types.ObjectId | null;
}

const RefundSchema: Schema<IRefund> = new Schema(
  {
    transaction: { type: Schema.Types.ObjectId, ref: "Transaction", required: true },
    refundAmount: { type: Number, required: true },
    refundReason: { type: String, required: true },
    pointsReversed: { type: Number, default: 0 },
    stockReversed: { type: Boolean, default: true },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IRefund>("Refund", RefundSchema);
