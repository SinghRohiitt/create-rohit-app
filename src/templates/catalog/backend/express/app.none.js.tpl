import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { AppError } from "./utils/errors.js";

export function createApp() {
  const app = express();
  const origins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: origins?.length ? origins : false }));
  app.use(express.json({ limit: "16kb" }));
  app.use("/api/health", healthRouter);
  app.use((_request, _response, next) => next(new AppError(404, "NOT_FOUND", "Route not found.")));
  app.use(errorHandler);
  return app;
}
