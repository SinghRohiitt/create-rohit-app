import mongoose from "mongoose";
import { UserModel } from "../modules/auth/user-model.js";

export async function connectDatabase(): Promise<void> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required for MongoDB.");
  await mongoose.connect(uri);
  await UserModel.init();
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
