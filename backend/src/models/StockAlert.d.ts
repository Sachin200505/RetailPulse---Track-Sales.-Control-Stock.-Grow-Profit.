import mongoose, { Document } from "mongoose";
export interface IStockAlert extends Document {
    product: mongoose.Types.ObjectId;
    triggeredAt: Date;
    resolved: boolean;
    stock: number;
}
declare const _default: mongoose.Model<IStockAlert, {}, {}, {}, mongoose.Document<unknown, {}, IStockAlert, {}, {}> & IStockAlert & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=StockAlert.d.ts.map