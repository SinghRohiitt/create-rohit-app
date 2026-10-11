import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AuthService } from "../src/modules/auth/auth-service.js";
import type { UserRecord, UserRepository } from "../src/modules/auth/auth-types.js";
import { hashPassword, verifyPassword } from "../src/modules/auth/password.js";
import { signAccessToken, verifyAccessToken } from "../src/modules/auth/token.js";

const secret = "test-secret-with-at-least-32-bytes-long";

class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    const user = { id: randomUUID(), email, passwordHash, createdAt: new Date() };
    this.users.set(user.id, user);
    return user;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }
}

describe("password hashing", () => {
  it("hashes passwords and verifies them without storing plaintext", async () => {
    const hash = await hashPassword("a-secure-test-password");
    expect(hash).not.toBe("a-secure-test-password");
    expect(await verifyPassword("a-secure-test-password", hash)).toBe(true);
    expect(await verifyPassword("incorrect-password", hash)).toBe(false);
  });
});

describe("JWT verification", () => {
  it("accepts valid signed tokens and rejects tampered tokens", () => {
    const token = signAccessToken("user-123", secret);
    expect(verifyAccessToken(token, secret).sub).toBe("user-123");
    expect(() => verifyAccessToken(`${token}tampered`, secret)).toThrow();
  });
});

describe("authentication routes", () => {
  const service = new AuthService(new MemoryUserRepository(), secret);
  const app = createApp(service);

  it("registers a user, returns a JWT, and protects the current-user route", async () => {
    const registration = await request(app)
      .post("/api/auth/register")
      .send({ email: "person@example.com", password: "a-secure-test-password" });
    expect(registration.status).toBe(201);
    expect(registration.body.user.email).toBe("person@example.com");
    expect(registration.body.user.passwordHash).toBeUndefined();
    expect(registration.body.accessToken).toEqual(expect.any(String));

    const duplicate = await request(app)
      .post("/api/auth/register")
      .send({ email: "PERSON@example.com", password: "a-secure-test-password" });
    expect(duplicate.status).toBe(409);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "PERSON@example.com", password: "a-secure-test-password" });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe("person@example.com");

    const currentUser = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registration.body.accessToken}`);
    expect(currentUser.status).toBe(200);
    expect(currentUser.body.user.id).toBe(registration.body.user.id);
  });

  it("rejects invalid credentials and malformed registration requests", async () => {
    const invalidLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "person@example.com", password: "wrong-password" });
    expect(invalidLogin.status).toBe(401);

    const invalidRegistration = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short", extra: true });
    expect(invalidRegistration.status).toBe(400);

    const malformedJson = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{");
    expect(malformedJson.status).toBe(400);
  });

  it("rejects protected requests without a valid token and allows stateless logout", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    const credentials = await request(app)
      .post("/api/auth/register")
      .send({ email: "logout@example.com", password: "a-secure-test-password" });
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${credentials.body.accessToken}`);
    expect(logout.status).toBe(204);
  });
});
