import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// Mock AuthGuard
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(() => {
    return class MockAuthGuard {
      getRequest(context: ExecutionContext) {
        const type = context.getType<'graphql' | 'http'>();

        if (type === 'http') {
          const httpContext = context.switchToHttp();
          return httpContext.getRequest();
        }

        return null;
      }

      canActivate(context: ExecutionContext) {
        return true;
      }
    };
  }),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('getRequest', () => {
    it('GraphQL 请求 - 从 GraphQL 上下文获取 req', () => {
      const mockReq = { headers: { authorization: 'Bearer token' } };
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
        getArgByIndex: jest.fn((index) => {
          if (index === 2) return { req: mockReq };
          return null;
        }),
      } as unknown as ExecutionContext;

      const result = guard.getRequest(mockContext);

      expect(result).toBe(mockReq);
      expect(mockContext.getArgByIndex).toHaveBeenCalledWith(2);
    });

    it('HTTP 请求 - 使用默认方法获取请求', () => {
      const mockReq = { headers: { authorization: 'Bearer token' } };
      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockReq),
        }),
      } as unknown as ExecutionContext;

      const result = guard.getRequest(mockContext);

      expect(result).toBe(mockReq);
    });

    it('GraphQL 上下文没有 req 时返回 undefined', () => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
        getArgByIndex: jest.fn().mockReturnValue(null),
      } as unknown as ExecutionContext;

      const result = guard.getRequest(mockContext);

      expect(result).toBeUndefined();
    });
  });

  describe('canActivate', () => {
    it('返回布尔值或 Promise', () => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({}),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockContext);

      // Mock AuthGuard 总是返回 true
      expect(result).toBe(true);
    });
  });
});
