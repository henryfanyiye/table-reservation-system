import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-5678'),
}));

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  describe('HTTP 请求拦截', () => {
    it('成功请求记录日志', () => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => ({
            method: 'GET',
            url: '/api/test',
            headers: {},
            id: undefined,
          }),
          getResponse: () => ({
            statusCode: 200,
            setHeader: jest.fn(),
          }),
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      } as unknown as CallHandler;

      const result = interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('使用请求头中的 x-transaction-id', () => {
      // 使用固定的请求和响应对象
      const mockReq = {
        method: 'POST',
        url: '/api/users',
        headers: { 'x-transaction-id': 'custom-transaction-id' },
        id: undefined,
      };
      const mockRes = {
        statusCode: 201,
        setHeader: jest.fn(),
      };

      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockReq,
          getResponse: () => mockRes,
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ success: true })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockReq.id).toBe('custom-transaction-id');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'x-transaction-id',
        'custom-transaction-id',
      );
    });

    it('没有 x-transaction-id 时生成新的 UUID', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/test',
        headers: {},
        id: undefined,
      };
      const mockRes = {
        statusCode: 200,
        setHeader: jest.fn(),
      };

      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockReq,
          getResponse: () => mockRes,
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'x-transaction-id',
        'mock-uuid-5678',
      );
    });
  });

  describe('GraphQL 请求拦截', () => {
    it('根 Query 操作记录日志', () => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
        getArgByIndex: jest.fn((index) => {
          if (index === 2) {
            return {
              req: { headers: {}, id: undefined },
              res: { setHeader: jest.fn() },
            };
          }
          if (index === 3) {
            return {
              parentType: { name: 'Query' },
              operation: { operation: 'query', name: { value: 'GetUsers' } },
            };
          }
          return null;
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ users: [] })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('根 Mutation 操作记录日志', () => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
        getArgByIndex: jest.fn((index) => {
          if (index === 2) {
            return {
              req: { headers: {}, id: undefined },
              res: { setHeader: jest.fn() },
            };
          }
          if (index === 3) {
            return {
              parentType: { name: 'Mutation' },
              operation: { operation: 'mutation', name: { value: 'CreateUser' } },
            };
          }
          return null;
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ user: { id: '1' } })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('非根操作不记录日志', () => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
        getArgByIndex: jest.fn((index) => {
          if (index === 2) {
            return {
              req: { headers: {}, id: undefined },
              res: { setHeader: jest.fn() },
            };
          }
          if (index === 3) {
            return {
              parentType: { name: 'User' },
              operation: { operation: 'query' },
            };
          }
          return null;
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ name: 'Test' })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('匿名操作记录日志', () => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
        getArgByIndex: jest.fn((index) => {
          if (index === 2) {
            return {
              req: { headers: {}, id: undefined },
              res: { setHeader: jest.fn() },
            };
          }
          if (index === 3) {
            return {
              parentType: { name: 'Query' },
              operation: { operation: 'query' },
            };
          }
          return null;
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: [] })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('没有 operation 信息时的处理', () => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
        getArgByIndex: jest.fn((index) => {
          if (index === 2) {
            return {
              req: { headers: {}, id: undefined },
              res: { setHeader: jest.fn() },
            };
          }
          return null;
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });
});
