export function createAuthController(service) {
  const register = async (request, response) => {
    const result = await service.register(request.body.email, request.body.password);
    response.status(201).json(result);
  };

  const login = async (request, response) => {
    const result = await service.login(request.body.email, request.body.password);
    response.status(200).json(result);
  };

  const currentUser = (_request, response) => {
    response.status(200).json({ user: response.locals.authUser });
  };

  const logout = (_request, response) => {
    response.status(204).end();
  };

  return { register, login, currentUser, logout };
}
