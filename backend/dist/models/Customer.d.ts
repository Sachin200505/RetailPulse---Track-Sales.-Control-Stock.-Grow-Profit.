import mongoose, { Document } from "mongoose";
export interface ICustomer extends Document {
    name: string;
    mobile: string;
    customerCode: string;
    creditPoints: number;
    pointsRedeemed: number;
    totalPurchases: number;
    tier: "Bronze" | "Silver" | "Gold";
}
declare const _default: mongoose.Model<ICustomer, {}, {}, {}, mongoose.Document<unknown, {}, ICustomer, {}, {}> & ICustomer & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Customer.d.ts.map