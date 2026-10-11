import { DuplicateEmailError } from "./auth-errors.js";
import { UserModel } from "./user-model.js";

export class UserRepository {
  async create(email, passwordHash) {
    try {
      const user = await UserModel.create({ email, passwordHash });
      return toUserRecord(user);
    } catch (error) {
      if (isMongoUniqueError(error)) throw new DuplicateEmailError();
      throw error;
    }
  }

  async findByEmail(email) {
    const user = await UserModel.findOne({ email }).select("+passwordHash").lean().exec();
    return user ? toUserRecord(user) : null;
  }

  async findById(id) {
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const user = await UserModel.findById(id).select("+passwordHash").lean().exec();
    return user ? toUserRecord(user) : null;
  }
}

function toUserRecord(user) {
  return { id: user._id.toString(), email: user.email, passwordHash: user.passwordHash, createdAt: user.createdAt };
}

function isMongoUniqueError(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
