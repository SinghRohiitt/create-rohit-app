import {
  ConflictException,
  Injectable,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserDocument, UserEntity } from "./user.schema.js";
import { UserRecord } from "./user.types.js";

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(UserEntity.name)
    private readonly users: Model<UserDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.users.init();
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.users
      .findOne({ email })
      .select("+passwordHash")
      .exec();
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    };
  }

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    try {
      const user = await this.users.create({ email, passwordHash });
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new ConflictException("An account with this email already exists.");
      }
      throw error;
    }
  }
}
