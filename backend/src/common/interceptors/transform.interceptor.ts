import { CallHandler, ExecutionContext, Injectable, NestInterceptor, } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否是 GraphQL 请求
    const isGraphQL = context.getType<'graphql' | 'http'>() === 'graphql';

    return next.handle().pipe(
      map((data) => {
        // GraphQL 请求直接返回数据，不做包装
        if (isGraphQL) {
          return data;
        }

        // HTTP 请求使用统一响应格式
        return {
          ...data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
