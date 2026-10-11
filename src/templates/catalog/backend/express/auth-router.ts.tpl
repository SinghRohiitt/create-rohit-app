import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { AuthServiceContract } from "./auth-types.js";
import { createAuthController } from "./auth-controller.js";
import { requireAuthentication } from "./auth-middleware.js";
import { loginSchema, registerSchema } from "./auth-schemas.js";
import { validateBody } from "../../middleware/validate-body.js";

export function authRouter(service: AuthServiceContract) {
  const router = Router();
  const controller = createAuthController(service);
  const authenticationLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });

  router.post("/register", authenticationLimit, validateBody(registerSchema), controller.register);
  router.post("/login", authenticationLimit, validateBody(loginSchema), controller.login);
  router.get("/me", requireAuthentication(service), controller.currentUser);
  router.post("/logout", requireAuthentication(service), controller.logout);
  return router;
}
