import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { UserRecord } from "./user.types.js";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user;
  }

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    try {
      return await this.prisma.user.create({
        data: { email, passwordHash },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException("An account with this email already exists.");
      }
      throw error;
    }
  }
}
