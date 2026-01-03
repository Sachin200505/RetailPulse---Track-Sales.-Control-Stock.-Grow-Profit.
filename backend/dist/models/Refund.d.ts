import mongoose, { Document } from "mongoose";
export interface IRefund extends Document {
    transaction: mongoose.Types.ObjectId;
    refundAmount: number;
    refundReason: string;
    pointsReversed: number;
    stockReversed: boolean;
    processedBy?: mongoose.Types.ObjectId | null;
}
declare const _default: mongoose.Model<IRefund, {}, {}, {}, mongoose.Document<unknown, {}, IRefund, {}, {}> & IRefund & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Refund.d.ts.map