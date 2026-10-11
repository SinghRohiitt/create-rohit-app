import { UnauthorizedError } from "./auth-errors.js";

export function requireAuthentication(service) {
  return async (request, response, next) => {
    const authorization = request.get("authorization");
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match) {
      next(new UnauthorizedError());
      return;
    }
    try {
      response.locals.authUser = await service.authenticate(match[1]);
      next();
    } catch (error) {
      next(error);
    }
  };
}
