import { prisma } from "../../config/database.js";
import { DuplicateEmailError } from "./auth-errors.js";

export class UserRepository {
  async create(email, passwordHash) {
    try {
      return await prisma.user.create({ data: { email, passwordHash } });
    } catch (error) {
      if (isPrismaUniqueError(error)) throw new DuplicateEmailError();
      throw error;
    }
  }

  findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }
}

function isPrismaUniqueError(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
