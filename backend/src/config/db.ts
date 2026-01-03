import mongoose from "mongoose";
import { ENV } from "./env";

const connectWithUri = async (uri: string) => {
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
};

export const connectDB = async (): Promise<void> => {
  if (!ENV.MONGO_URI) {
    console.error("❌ MONGO_URI is not set; cannot start the server");
    process.exit(1);
  }

  try {
    await connectWithUri(ENV.MONGO_URI);
  } catch (error) {
    console.error("❌ MongoDB connection failed");
    console.error(error);
    process.exit(1);
  }
};
