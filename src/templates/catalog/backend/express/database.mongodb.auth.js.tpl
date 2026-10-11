import mongoose from "mongoose";
import { UserModel } from "../modules/auth/user-model.js";

export async function connectDatabase() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required for MongoDB.");
  await mongoose.connect(uri);
  await UserModel.init();
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
