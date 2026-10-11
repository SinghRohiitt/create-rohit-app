import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { AuthService } from "./modules/auth/auth-service.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth-router.js";
import { createAuthService } from "./modules/auth/index.js";
import { healthRouter } from "./routes/health.js";
import { AppError } from "./utils/errors.js";

export function createApp(authService: AuthService | undefined = createAuthService()) {
  const app = express();
  const origins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: origins?.length ? origins : false }));
  app.use(express.json({ limit: "16kb" }));
  app.use("/api/health", healthRouter);
  if (authService) app.use("/api/auth", authRouter(authService));
  app.use((_request, _response, next) => next(new AppError(404, "NOT_FOUND", "Route not found.")));
  app.use(errorHandler);
  return app;
}
