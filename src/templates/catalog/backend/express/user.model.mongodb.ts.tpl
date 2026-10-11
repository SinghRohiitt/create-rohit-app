import mongoose, { type Model } from "mongoose";

interface UserData {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserData>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel =
  (mongoose.models.User as Model<UserData> | undefined) ??
  mongoose.model<UserData>("User", userSchema);
