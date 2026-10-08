export class TemplateEngineError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TemplateEngineError";
  }
}

export class GenerationError extends TemplateEngineError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GenerationError";
  }
}

export class InvalidTemplateError extends TemplateEngineError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTemplateError";
  }
}

export class TemplateNotFoundError extends TemplateEngineError {
  constructor(templateId: string) {
    super(`No template with id "${templateId}" was found.`);
    this.name = "TemplateNotFoundError";
  }
}

export class DestinationConflictError extends TemplateEngineError {
  constructor(message: string) {
    super(message);
    this.name = "DestinationConflictError";
  }
}
