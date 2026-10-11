import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required for MongoDB.");
  await mongoose.connect(uri);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
