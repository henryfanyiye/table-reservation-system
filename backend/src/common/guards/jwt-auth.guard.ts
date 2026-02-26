import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT 认证守卫
 *
 * 用于保护需要身份验证的端点
 * 使用方式：@UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * 重写 getRequest 方法以正确处理 GraphQL 上下文
   */
  getRequest(context: ExecutionContext) {
    const type = context.getType<'graphql' | 'http'>();

    if (type === 'graphql') {
      // GraphQL 请求：从 GraphQL 上下文中获取 req
      const gqlContext = context.getArgByIndex(2);
      return gqlContext?.req;
    }

    // HTTP 请求：使用默认方法
    return super.getRequest(context);
  }

  /**
   * canActivate 方法
   *
   * 验证 JWT token 是否有效
   * - 有效：允许访问
   * - 无效：抛出 401 Unauthorized 错误
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context) as boolean | Promise<boolean> | Observable<boolean>;
  }
}
