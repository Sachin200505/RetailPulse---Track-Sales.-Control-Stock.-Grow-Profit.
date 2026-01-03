import mongoose, { Document } from "mongoose";
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
declare const _default: mongoose.Model<IExpense, {}, {}, {}, mongoose.Document<unknown, {}, IExpense, {}, {}> & IExpense & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Expense.d.ts.map