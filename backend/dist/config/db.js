"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const env_1 = require("./env");
const connectWithUri = async (uri) => {
    await mongoose_1.default.connect(uri);
    console.log(`✅ MongoDB connected (${uri})`);
};
const connectDB = async () => {
    try {
        if (env_1.ENV.MONGO_URI === "memory") {
            const mongod = await mongodb_memory_server_1.MongoMemoryServer.create();
            await connectWithUri(mongod.getUri());
            return;
        }
        await connectWithUri(env_1.ENV.MONGO_URI);
    }
    catch (error) {
        console.error("❌ MongoDB connection failed, falling back to in-memory server");
        console.error(error);
        try {
            const mongod = await mongodb_memory_server_1.MongoMemoryServer.create();
            await connectWithUri(mongod.getUri());
        }
        catch (fallbackError) {
            console.error("❌ In-memory MongoDB startup failed");
            console.error(fallbackError);
            process.exit(1);
        }
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=db.js.map