export interface UserRecord {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: Date;
}

export type PublicUser = Pick<UserRecord, "id" | "email" | "createdAt">;

export interface UserRepository {
  create(email: string, passwordHash: string): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}

export interface AuthPayload {
  readonly sub: string;
  readonly iss: "create-rohitsingh0408-app";
  readonly aud: "create-rohitsingh0408-app-api";
}

export interface AuthServiceContract {
  register(email: string, password: string): Promise<{ user: PublicUser; accessToken: string; tokenType: "Bearer"; expiresIn: number }>;
  login(email: string, password: string): Promise<{ user: PublicUser; accessToken: string; tokenType: "Bearer"; expiresIn: number }>;
  authenticate(token: string): Promise<PublicUser>;
}
