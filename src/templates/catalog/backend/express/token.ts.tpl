import jwt, { type JwtPayload } from "jsonwebtoken";
import { UnauthorizedError } from "./auth-errors.js";
import type { AuthPayload } from "./auth-types.js";

const issuer = "create-rohitsingh0408-app";
const audience = "create-rohitsingh0408-app-api";
const expiresInSeconds = 900;

export function signAccessToken(userId: string, secret: string): string {
  return jwt.sign({}, secret, { subject: userId, issuer, audience, expiresIn: expiresInSeconds, algorithm: "HS256" });
}

export function verifyAccessToken(token: string, secret: string): AuthPayload {
  try {
    const payload = jwt.verify(token, secret, { issuer, audience, algorithms: ["HS256"] }) as JwtPayload;
    if (!payload.sub || typeof payload.sub !== "string") throw new UnauthorizedError();
    return { sub: payload.sub, iss: issuer, aud: audience };
  } catch {
    throw new UnauthorizedError();
  }
}

export { expiresInSeconds };
