import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';
    const message = resolveErrorMessage(exceptionResponse);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
      error: exceptionResponse,
    });
  }
}

function resolveErrorMessage(exceptionResponse: unknown) {
  if (typeof exceptionResponse === 'string') {
    return exceptionResponse;
  }

  if (
    exceptionResponse &&
    typeof exceptionResponse === 'object' &&
    'message' in exceptionResponse
  ) {
    const value = exceptionResponse.message;

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }
  }

  return 'Request failed';
}
