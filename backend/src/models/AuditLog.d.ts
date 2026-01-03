import mongoose, { Document } from "mongoose";
export interface IAuditLog extends Document {
    action: string;
    user: mongoose.Types.ObjectId;
    metadata?: any;
}
declare const _default: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=AuditLog.d.ts.map