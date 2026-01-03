import mongoose, { Document } from "mongoose";
export interface IProduct extends Document {
    name: string;
    sku: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    description?: string;
    isActive: boolean;
    expiryDate?: Date;
    createdBy: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Product.d.ts.map