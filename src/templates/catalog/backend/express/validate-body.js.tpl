export function validateBody(schema) {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    request.body = result.data;
    next();
  };
}
