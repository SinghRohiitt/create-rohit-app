import bcrypt from "bcryptjs";

const workFactor = 12;

export function hashPassword(password) {
  return bcrypt.hash(password, workFactor);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
