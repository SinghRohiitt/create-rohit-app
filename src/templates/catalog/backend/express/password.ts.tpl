import bcrypt from "bcryptjs";

const workFactor = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, workFactor);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
