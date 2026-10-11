import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed.", details: error.issues.map(({ path, message }) => ({ path: path.join("."), message })) },
    });
    return;
  }
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" && error.status >= 400 && error.status < 500) {
    response.status(error.status).json({ error: { code: "INVALID_REQUEST", message: "Request could not be processed." } });
    return;
  }
  console.error(error);
  response.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } });
};
