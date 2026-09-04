import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface NestErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      const resObj = exception.getResponse() as string | NestErrorResponse;
      message = exception.message;
      if (typeof resObj === 'string') {
        message = resObj;
      } else if (typeof resObj === 'object' && resObj !== null) {
        const rawMessage = resObj.message || exception.message;
        message = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage);
        code = resObj.code || 'HTTP_EXCEPTION';
        details = resObj.details || null;
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // Fora de produção expõe a causa real (mensagem + stack) para depurar.
      // Em produção mantém o genérico acima — nunca vazar erro interno ao cliente.
      if (exception instanceof Error) {
        message = exception.message;
        code = exception.name || 'ERROR';
        details = exception.stack;
      } else {
        message = typeof exception === 'string' ? exception : String(exception);
        code = 'UNKNOWN_ERROR';
      }
    }

    // Log all 5xx or unhandled non-HttpExceptions
    if (status >= 500 || !(exception instanceof HttpException)) {
      const logMessage = exception instanceof Error ? exception.stack || exception.message : String(exception);
      this.logger.error(logMessage);
    }

    response.status(status).json({
      code,
      message,
      details,
    });
  }
}
