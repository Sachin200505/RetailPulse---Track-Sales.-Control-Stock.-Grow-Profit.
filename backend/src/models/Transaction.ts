import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  customer?: mongoose.Types.ObjectId | null;
  invoiceNumber: string;
  items: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    gstRate?: number;
    gstAmount?: number;
    totalWithGst?: number;
  }[];
  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card";
  paymentStatus: string;
  creditPointsEarned: number;
  checkoutLocked: boolean;
  isRefunded: boolean;
  refundId?: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        productName: {
          type: String,
          required: true
        },
        quantity: {
          type: Number,
          required: true
        },
        unitPrice: {
          type: Number,
          required: true
        },
        subtotal: {
          type: Number,
          required: true
        },
        gstRate: {
          type: Number,
          default: 0
        },
        gstAmount: {
          type: Number,
          default: 0
        },
        totalWithGst: {
          type: Number,
          default: 0
        }
      }
    ],
    subtotal: {
      type: Number,
      required: true
    },
    gstAmount: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card"],
      required: true
    },
    paymentStatus: {
      type: String,
      default: "completed"
    },
    creditPointsEarned: {
      type: Number,
      default: 0
    },
    checkoutLocked: {
      type: Boolean,
      default: false
    },
    isRefunded: {
      type: Boolean,
      default: false
    },
    refundId: {
      type: Schema.Types.ObjectId,
      ref: "Refund",
      required: false,
      default: null
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);
