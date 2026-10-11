import type { RequestHandler } from "express";
import type { AuthServiceContract } from "./auth-types.js";

export function createAuthController(service: AuthServiceContract) {
  const register: RequestHandler = async (request, response) => {
    const result = await service.register(request.body.email, request.body.password);
    response.status(201).json(result);
  };

  const login: RequestHandler = async (request, response) => {
    const result = await service.login(request.body.email, request.body.password);
    response.status(200).json(result);
  };

  const currentUser: RequestHandler = (_request, response) => {
    response.status(200).json({ user: response.locals.authUser });
  };

  const logout: RequestHandler = (_request, response) => {
    response.status(204).end();
  };

  return { register, login, currentUser, logout };
}
