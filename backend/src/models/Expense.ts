import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  category: string;
  description?: string | null;
  amount: number;
  expenseDate: Date;
  paymentMethod: string;
  vendor?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  createdBy: mongoose.Types.ObjectId;
}

const ExpenseSchema: Schema<IExpense> = new Schema(
  {
    category: { type: String, required: true },
    description: { type: String, default: null },
    amount: { type: Number, required: true },
    expenseDate: { type: Date, required: true },
    paymentMethod: { type: String, required: true },
    vendor: { type: String, default: null },
    receiptUrl: { type: String, default: null },
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IExpense>("Expense", ExpenseSchema);
