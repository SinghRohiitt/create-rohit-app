import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./auth-errors.js";

const issuer = "create-rohitsingh0408-app";
const audience = "create-rohitsingh0408-app-api";
export const expiresInSeconds = 900;

export function signAccessToken(userId, secret) {
  return jwt.sign({}, secret, { subject: userId, issuer, audience, expiresIn: expiresInSeconds, algorithm: "HS256" });
}

export function verifyAccessToken(token, secret) {
  try {
    const payload = jwt.verify(token, secret, { issuer, audience, algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.sub !== "string") throw new UnauthorizedError();
    return { sub: payload.sub, iss: issuer, aud: audience };
  } catch {
    throw new UnauthorizedError();
  }
}
