export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
}
