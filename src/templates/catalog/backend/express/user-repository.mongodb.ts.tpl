import { DuplicateEmailError } from "./auth-errors.js";
import type { UserRecord, UserRepository as UserRepositoryContract } from "./auth-types.js";
import { UserModel } from "./user-model.js";

export class UserRepository implements UserRepositoryContract {
  async create(email: string, passwordHash: string): Promise<UserRecord> {
    try {
      const user = await UserModel.create({ email, passwordHash });
      return toUserRecord(user);
    } catch (error) {
      if (isMongoUniqueError(error)) throw new DuplicateEmailError();
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await UserModel.findOne({ email }).select("+passwordHash").lean().exec();
    return user ? toUserRecord(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const user = await UserModel.findById(id).select("+passwordHash").lean().exec();
    return user ? toUserRecord(user) : null;
  }
}

function toUserRecord(user: { _id: { toString(): string }; email: string; passwordHash: string; createdAt: Date }): UserRecord {
  return { id: user._id.toString(), email: user.email, passwordHash: user.passwordHash, createdAt: user.createdAt };
}

function isMongoUniqueError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
