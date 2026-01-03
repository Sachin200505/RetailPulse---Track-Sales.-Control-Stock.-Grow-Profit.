import mongoose, { Schema, Document } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  mobile: string;
  customerCode: string;
  creditPoints: number;
  pointsRedeemed: number;
  totalPurchases: number;
  tier: "Bronze" | "Silver" | "Gold";
}

const CustomerSchema: Schema<ICustomer> = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    mobile: {
      type: String,
      required: true
    },
    customerCode: {
      type: String,
      unique: true,
      required: true
    },
    creditPoints: {
      type: Number,
      default: 0
    },
    pointsRedeemed: {
      type: Number,
      default: 0
    },
    totalPurchases: {
      type: Number,
      default: 0
    },
    tier: {
      type: String,
      enum: ["Bronze", "Silver", "Gold"],
      default: "Bronze"
    }
  },
  { timestamps: true }
);

export default mongoose.model<ICustomer>("Customer", CustomerSchema);
