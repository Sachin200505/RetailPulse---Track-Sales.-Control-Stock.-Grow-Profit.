// Seed owner user into MongoDB
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["owner", "admin", "staff", "cashier"], default: "owner" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

async function run() {
  const email = "sachinsundar200505@gmail.com";
  const plainPassword = "123123123";
  const hashed = await bcrypt.hash(plainPassword, 10);

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB for seeding");

  const update = {
    name: "Owner",
    email,
    password: hashed,
    role: "owner",
    isActive: true,
  };

  const result = await User.findOneAndUpdate({ email }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  console.log("Seeded owner user:", { email: result.email, role: result.role, id: result._id });
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
