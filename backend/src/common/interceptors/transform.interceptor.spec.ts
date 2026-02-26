import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  describe('HTTP 请求拦截', () => {
    it('为响应添加 timestamp', (done) => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ success: true, data: 'test' })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual({
          success: true,
          data: 'test',
          timestamp: expect.any(String),
        });
        expect(new Date(result.timestamp)).toBeInstanceOf(Date);
        done();
      });
    });

    it('保留原始响应的所有字段', (done) => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
      } as unknown as ExecutionContext;

      const originalData = {
        success: true,
        message: 'Success',
        code: '200',
        data: { id: 1, name: 'Test' },
      };

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(originalData)),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result.success).toBe(true);
        expect(result.message).toBe('Success');
        expect(result.code).toBe('200');
        expect(result.data).toEqual({ id: 1, name: 'Test' });
        expect(result.timestamp).toBeDefined();
        done();
      });
    });

    it('timestamp 格式为 ISO 8601', (done) => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('http'),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        done();
      });
    });
  });

  describe('GraphQL 请求拦截', () => {
    it('直接返回数据，不添加 timestamp', (done) => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      const originalData = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      };

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(originalData)),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual(originalData);
        expect(result).not.toHaveProperty('timestamp');
        done();
      });
    });

    it('不修改 GraphQL 响应结构', (done) => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      const originalData = { user: { id: '123', name: 'Test User' } };

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(originalData)),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result).toBe(originalData);
        expect(Object.keys(result)).toEqual(['user']);
        done();
      });
    });

    it('GraphQL 空响应保持不变', (done) => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(null)),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('GraphQL 数组响应保持不变', (done) => {
      const mockContext = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of([1, 2, 3])),
      } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result).toEqual([1, 2, 3]);
        expect(Array.isArray(result)).toBe(true);
        done();
      });
    });
  });
});
