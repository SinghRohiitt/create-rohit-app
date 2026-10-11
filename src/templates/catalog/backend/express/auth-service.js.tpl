import { DuplicateEmailError, InvalidCredentialsError, UnauthorizedError } from "./auth-errors.js";
import { hashPassword, verifyPassword } from "./password.js";
import { expiresInSeconds, signAccessToken, verifyAccessToken } from "./token.js";

export class AuthService {
  constructor(users, secret) {
    this.users = users;
    this.secret = secret;
  }

  async register(email, password) {
    if (await this.users.findByEmail(email)) throw new DuplicateEmailError();
    const passwordHash = await hashPassword(password);
    const user = await this.users.create(email, passwordHash);
    return this.issueCredentials(user);
  }

  async login(email, password) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) throw new InvalidCredentialsError();
    return this.issueCredentials(user);
  }

  async authenticate(token) {
    const payload = verifyAccessToken(token, this.secret);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedError();
    return this.toPublicUser(user);
  }

  issueCredentials(user) {
    return {
      user: this.toPublicUser(user),
      accessToken: signAccessToken(user.id, this.secret),
      tokenType: "Bearer",
      expiresIn: expiresInSeconds,
    };
  }

  toPublicUser(user) {
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}
