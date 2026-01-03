import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ENV } from "./env";

const connectWithUri = async (uri: string) => {
  await mongoose.connect(uri);
  console.log(`✅ MongoDB connected (${uri})`);
};

export const connectDB = async (): Promise<void> => {
  try {
    if (ENV.MONGO_URI === "memory") {
      const mongod = await MongoMemoryServer.create();
      await connectWithUri(mongod.getUri());
      return;
    }

    await connectWithUri(ENV.MONGO_URI);
  } catch (error) {
    console.error("❌ MongoDB connection failed, falling back to in-memory server");
    console.error(error);
    try {
      const mongod = await MongoMemoryServer.create();
      await connectWithUri(mongod.getUri());
    } catch (fallbackError) {
      console.error("❌ In-memory MongoDB startup failed");
      console.error(fallbackError);
      process.exit(1);
    }
  }
};
