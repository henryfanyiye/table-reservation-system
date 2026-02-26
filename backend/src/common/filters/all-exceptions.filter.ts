import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Logger, } from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // 检测请求类型
    const isGraphQL = host.getType<'graphql' | 'http'>() === 'graphql';

    if (isGraphQL) {
      // GraphQL 请求 - 只记录日志，不修改响应
      this.logGraphQLException(exception, host);
      // 让 NestJS 的默认异常处理来处理 GraphQL 错误
      throw exception;
    }

    // HTTP 请求处理
    this.handleHttpException(exception, host);
  }

  private logGraphQLException(exception: unknown, host: ArgumentsHost): void {
    const gqlContext = host.getArgByIndex(2);
    const info = host.getArgByIndex(3);
    const requestId = gqlContext?.req?.id || uuidv4();
    const operationName = (info as any)?.operationName || 'Anonymous';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `[${requestId}] GraphQL 错误 - ${operationName} - ${status} - ${message}`,
      {
        requestId,
        operationName,
        statusCode: status,
        error:
          exception instanceof Error
            ? {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
              }
            : exception,
      },
    );
  }

  private handleHttpException(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object') {
        errorDetails = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = { name: exception.name, message: exception.message };
    }

    // 安全地获取请求信息
    const requestId = request?.id || uuidv4();
    const url = request?.url || 'unknown';
    const method = request?.method || 'UNKNOWN';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: url,
      method,
      requestId,
      message,
      ...(process.env.NODE_ENV !== 'production' && { details: errorDetails }),
    };

    // 记录错误日志
    const stackTrace = exception instanceof Error ? exception.stack : undefined;
    const logMessage = `${method} ${url} - ${status} - ${message}`;

    this.logger.error(logMessage, {
      requestId,
      statusCode: status,
      path: url,
      method,
      error:
        exception instanceof Error
          ? {
              name: exception.name,
              message: exception.message,
              stack: stackTrace,
            }
          : exception,
    });

    response.status(status).json(errorResponse);
  }
}
