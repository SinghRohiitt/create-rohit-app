import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { UserService } from "../users/user.service.js";
import { AuthenticatedUser, AuthResponse } from "./auth.types.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string): Promise<AuthResponse> {
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new BadRequestException("Password must not exceed 72 UTF-8 bytes.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }
    const passwordHash = await hash(password, 12);
    const user = await this.users.create(normalizedEmail, passwordHash);
    return this.createAuthResponse(user.id, user.email);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new BadRequestException("Password must not exceed 72 UTF-8 bytes.");
    }
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    return this.createAuthResponse(user.id, user.email);
  }

  private async createAuthResponse(
    id: string,
    email: string,
  ): Promise<AuthResponse> {
    const user: AuthenticatedUser = { id, email };
    const accessToken = await this.jwt.signAsync(
      { sub: id, email },
      {
        expiresIn: "15m",
        issuer: "{{projectName}}",
        audience: "{{projectName}}",
        algorithm: "HS256",
      },
    );
    return { accessToken, user };
  }
}
