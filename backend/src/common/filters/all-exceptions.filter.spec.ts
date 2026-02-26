import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockContext: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      id: 'req-123',
      url: '/test/path',
      method: 'GET',
      headers: {},
    };

    mockContext = {
      getType: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  describe('HTTP 请求异常处理', () => {
    it('处理 HttpException', () => {
      mockContext.getType.mockReturnValue('http');
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockContext as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Not found',
          path: '/test/path',
          method: 'GET',
        }),
      );
    });

    it('处理普通 Error', () => {
      mockContext.getType.mockReturnValue('http');
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockContext as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Something went wrong',
        }),
      );
    });

    it('处理未知异常', () => {
      mockContext.getType.mockReturnValue('http');
      const exception = 'string error';

      filter.catch(exception, mockContext as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );
    });

    it('开发环境下包含错误详情', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockContext.getType.mockReturnValue('http');
      const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockContext as ArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.any(Object),
        }),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('生产环境下不包含错误详情', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockContext.getType.mockReturnValue('http');
      const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockContext as ArgumentsHost);

      const responseArg = mockResponse.json.mock.calls[0][0];
      expect(responseArg).not.toHaveProperty('details');

      process.env.NODE_ENV = originalEnv;
    });

    it('没有请求信息时使用默认值', () => {
      mockContext.switchToHttp = jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      });
      mockContext.getType.mockReturnValue('http');
      const exception = new Error('Test error');

      filter.catch(exception, mockContext as ArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'unknown',
          method: 'UNKNOWN',
          requestId: 'mock-uuid-1234',
        }),
      );
    });
  });

  describe('GraphQL 请求异常处理', () => {
    it('GraphQL 异常被重新抛出', () => {
      mockContext.getType.mockReturnValue('graphql');
      mockContext.getArgByIndex.mockImplementation((index) => {
        if (index === 2) return { req: { id: 'gql-req-123' } };
        if (index === 3) return { operationName: 'TestQuery' };
        return null;
      });

      const exception = new Error('GraphQL error');

      expect(() => filter.catch(exception, mockContext as ArgumentsHost)).toThrow(exception);
    });

    it('GraphQL HttpException 被正确处理并重新抛出', () => {
      mockContext.getType.mockReturnValue('graphql');
      mockContext.getArgByIndex.mockImplementation((index) => {
        if (index === 2) return { req: { id: 'gql-req-456' } };
        if (index === 3) return { operationName: 'CreateUser' };
        return null;
      });

      const exception = new HttpException('User not found', HttpStatus.NOT_FOUND);

      expect(() => filter.catch(exception, mockContext as ArgumentsHost)).toThrow(exception);
    });
  });
});
