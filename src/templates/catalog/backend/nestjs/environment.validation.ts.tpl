import { plainToInstance } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from "class-validator";

class Environment {
  @IsOptional()
  @IsIn(["development", "test", "production"])
  NODE_ENV = "development";

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT = 3000;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;
}

export function validateEnvironment(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const databaseType: string = "{{database}}";
  const authenticationType: string = "{{authentication}}";
  const requiresDatabase = databaseType !== "none";
  const requiresJwt = authenticationType === "jwt";
  const environment = plainToInstance(Environment, {
    ...values,
    PORT: Number(values.PORT ?? 3000),
  });
  const errors = validateSync(environment, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${errors
        .flatMap((error) => Object.values(error.constraints ?? {}))
        .join("; ")}`,
    );
  }
  if (
    requiresDatabase &&
    (typeof environment.DATABASE_URL !== "string" ||
      environment.DATABASE_URL.length === 0)
  ) {
    throw new Error("DATABASE_URL must be set.");
  }
  if (
    requiresJwt &&
    (typeof environment.JWT_SECRET !== "string" ||
      Buffer.byteLength(environment.JWT_SECRET, "utf8") < 32)
  ) {
    throw new Error("JWT_SECRET must be at least 32 bytes.");
  }
  return values;
}
