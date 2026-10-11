import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { compare } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/auth/auth.service.js";
import { UserService } from "../src/users/user.service.js";

describe("AuthService", () => {
  const userRepository = {
    findByEmail: vi.fn(),
    create: vi.fn(),
  };
  let service: AuthService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userRepository },
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: "test-secret-that-is-at-least-32-bytes",
          }),
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it("hashes passwords and returns a signed token when registering", async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockImplementation(
      async (email: string, passwordHash: string) => ({
        id: "user-1",
        email,
        passwordHash,
        createdAt: new Date(),
      }),
    );

    const result = await service.register("Person@Example.com", "a-long-password");

    expect(userRepository.create).toHaveBeenCalledOnce();
    const savedHash = userRepository.create.mock.calls[0][1] as string;
    expect(savedHash).not.toBe("a-long-password");
    expect(await compare("a-long-password", savedHash)).toBe(true);
    expect(result.user).toEqual({ id: "user-1", email: "person@example.com" });
    expect(result.accessToken.split(".")).toHaveLength(3);
  });

  it("rejects invalid credentials", async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      service.login("person@example.com", "incorrect"),
    ).rejects.toThrow("Invalid email or password.");
  });

  it("rejects duplicate registrations", async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: "existing",
      email: "person@example.com",
      passwordHash: "hash",
      createdAt: new Date(),
    });

    await expect(
      service.register("person@example.com", "a-long-password"),
    ).rejects.toThrow("An account with this email already exists.");
  });

  it("rejects passwords that bcrypt would truncate", async () => {
    await expect(
      service.register("person@example.com", "a".repeat(73)),
    ).rejects.toThrow("72 UTF-8 bytes");
  });

  it("rejects login passwords that bcrypt would truncate", async () => {
    await expect(
      service.login("person@example.com", "a".repeat(73)),
    ).rejects.toThrow("72 UTF-8 bytes");
  });
});
