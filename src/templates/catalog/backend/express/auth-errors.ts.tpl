import { AppError } from "../../utils/errors.js";

export class DuplicateEmailError extends AppError {
  constructor() {
    super(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, "UNAUTHORIZED", "A valid access token is required.");
  }
}
