import { AuthService } from "./auth-service.js";
import { UserRepository } from "./user-repository.js";

export function createAuthService(): AuthService {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes of unpredictable secret material.");
  }
  return new AuthService(new UserRepository(), secret);
}
