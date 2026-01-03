import mongoose, { Schema, Document } from "mongoose";

export interface ICategoryGST extends Document {
  name: string;
  gstRate: number;
  updatedAt?: Date;
}

const CategoryGSTSchema: Schema<ICategoryGST> = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    gstRate: { type: Number, required: true, min: 0, max: 28, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ICategoryGST>("CategoryGST", CategoryGSTSchema);
