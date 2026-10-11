import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload } from "./auth.types.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
      issuer: "{{projectName}}",
      audience: "{{projectName}}",
      algorithms: ["HS256"],
    });
  }

  validate(payload: JwtPayload): { id: string; email: string } {
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string"
    ) {
      throw new UnauthorizedException("Invalid access token.");
    }
    return { id: payload.sub, email: payload.email };
  }
}
