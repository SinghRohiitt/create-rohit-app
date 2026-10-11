import { prisma } from "../../config/database.js";
import { DuplicateEmailError } from "./auth-errors.js";
import type { UserRecord, UserRepository as UserRepositoryContract } from "./auth-types.js";

export class UserRepository implements UserRepositoryContract {
  async create(email: string, passwordHash: string): Promise<UserRecord> {
    try {
      return await prisma.user.create({ data: { email, passwordHash } });
    } catch (error) {
      if (isPrismaUniqueError(error)) throw new DuplicateEmailError();
      throw error;
    }
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { id } });
  }
}

function isPrismaUniqueError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
