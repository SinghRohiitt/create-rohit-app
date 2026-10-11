import { DuplicateEmailError, InvalidCredentialsError, UnauthorizedError } from "./auth-errors.js";
import type { AuthPayload, AuthServiceContract, PublicUser, UserRecord, UserRepository } from "./auth-types.js";
import { hashPassword, verifyPassword } from "./password.js";
import { expiresInSeconds, signAccessToken, verifyAccessToken } from "./token.js";

export class AuthService implements AuthServiceContract {
  constructor(private readonly users: UserRepository, private readonly secret: string) {}

  async register(email: string, password: string) {
    if (await this.users.findByEmail(email)) throw new DuplicateEmailError();
    const passwordHash = await hashPassword(password);
    const user = await this.users.create(email, passwordHash);
    return this.issueCredentials(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) throw new InvalidCredentialsError();
    return this.issueCredentials(user);
  }

  async authenticate(token: string): Promise<PublicUser> {
    const payload: AuthPayload = verifyAccessToken(token, this.secret);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedError();
    return this.toPublicUser(user);
  }

  private issueCredentials(user: UserRecord) {
    return {
      user: this.toPublicUser(user),
      accessToken: signAccessToken(user.id, this.secret),
      tokenType: "Bearer" as const,
      expiresIn: expiresInSeconds,
    };
  }

  private toPublicUser(user: UserRecord): PublicUser {
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}
