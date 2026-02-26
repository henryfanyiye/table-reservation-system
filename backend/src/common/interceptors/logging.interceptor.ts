import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

interface GraphQLInfo {
  parentType?: { name: string };
  fieldName?: string;
  operation?: { operation: string; name?: { value: string } };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = context.getType() as string;
    return type === 'graphql'
      ? this.handleGraphQL(context, next)
      : this.handleHttp(context, next);
  }

  private setupRequestId(req: any, res: any): string {
    const requestId = (req.headers?.['x-transaction-id'] as string) || uuidv4();
    req.id = requestId;
    res?.setHeader('x-transaction-id', requestId);
    return requestId;
  }

  private handleGraphQL(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const gqlContext = context.getArgByIndex(2);
    const info = context.getArgByIndex(3) as GraphQLInfo | undefined;
    const requestId = this.setupRequestId(gqlContext?.req, gqlContext?.res);

    const parentType = info?.parentType?.name;
    const isRoot =
      parentType === 'Query' ||
      parentType === 'Mutation' ||
      parentType === 'Subscription';

    if (isRoot) {
      const operation = info?.operation?.operation || 'query';
      const name = info?.operation?.name?.value || 'Anonymous';
      this.logger.log(`[${requestId}] GQL ${operation.toUpperCase()} ${name}`);
    }

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          isRoot &&
          this.logger.log(`[${requestId}] GQL 完成 - ${Date.now() - now}ms`),
        error: () =>
          this.logger.error(`[${requestId}] GQL 错误 - ${Date.now() - now}ms`),
      }),
    );
  }

  private handleHttp(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;
    const requestId = this.setupRequestId(request, response);

    this.logger.log(`[${requestId}] ${method} ${url}`);
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `[${requestId}] ${method} ${url} - ${response.statusCode} - ${Date.now() - now}ms`,
          ),
        error: () =>
          this.logger.error(
            `[${requestId}] ${method} ${url} - 错误 - ${Date.now() - now}ms`,
          ),
      }),
    );
  }
}
