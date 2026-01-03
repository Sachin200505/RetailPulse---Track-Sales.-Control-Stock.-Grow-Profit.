import mongoose, { Document } from "mongoose";
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
declare const _default: mongoose.Model<ITransaction, {}, {}, {}, mongoose.Document<unknown, {}, ITransaction, {}, {}> & ITransaction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Transaction.d.ts.map