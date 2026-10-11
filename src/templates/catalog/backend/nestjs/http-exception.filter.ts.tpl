import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
