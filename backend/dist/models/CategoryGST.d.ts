import mongoose, { Document } from "mongoose";
export interface ICategoryGST extends Document {
    name: string;
    gstRate: number;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<ICategoryGST, {}, {}, {}, mongoose.Document<unknown, {}, ICategoryGST, {}, {}> & ICategoryGST & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=CategoryGST.d.ts.map