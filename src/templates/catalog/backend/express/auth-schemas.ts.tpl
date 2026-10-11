import { z } from "zod";

const passwordSchema = z.string().min(12).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72);
const credentials = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: passwordSchema,
}).strict();

export const registerSchema = credentials;
export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72),
}).strict();
