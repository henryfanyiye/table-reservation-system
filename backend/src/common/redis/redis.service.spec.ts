import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { REDIS_OPTIONS, RedisModuleOptions } from './redis.constants';
import { RedisClientType } from 'redis';

// Mock redis 模块
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: jest.Mocked<RedisClientType>;
  const mockEval = jest.fn();
  const mockGet = jest.fn();
  const mockSetEx = jest.fn();
  const mockDel = jest.fn();
  const mockConnect = jest.fn();
  const mockQuit = jest.fn();
  const mockOn = jest.fn();

  const mockRedisOptions: RedisModuleOptions = {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
  };

  beforeEach(async () => {
    // 创建 mock client
    mockClient = {
      connect: mockConnect,
      quit: mockQuit,
      on: mockOn,
      eval: mockEval,
      get: mockGet,
      setEx: mockSetEx,
      del: mockDel,
    } as unknown as jest.Mocked<RedisClientType>;

    // Mock createClient
    const { createClient } = require('redis');
    createClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: REDIS_OPTIONS,
          useValue: mockRedisOptions,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);

    // Mock 连接成功
    mockConnect.mockResolvedValue(undefined);
    mockQuit.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (service) {
      await service.onModuleDestroy();
    }
  });

  describe('onModuleInit', () => {
    it('成功连接 Redis', async () => {
      mockConnect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockConnect).toHaveBeenCalled();
    });

    it('连接失败时抛出异常', async () => {
      mockConnect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });

    it('设置事件处理器', async () => {
      mockConnect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('onModuleDestroy', () => {
    it('成功断开连接', async () => {
      mockQuit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockQuit).toHaveBeenCalled();
    });

    it('断开连接失败时记录错误', async () => {
      mockQuit.mockRejectedValue(new Error('Disconnect failed'));

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('get', () => {
    it('成功获取值', async () => {
      mockGet.mockResolvedValue('value');

      const result = await service.get('test-key');

      expect(result).toBe('value');
      expect(mockGet).toHaveBeenCalledWith('test-key');
    });

    it('键不存在时返回 null', async () => {
      mockGet.mockResolvedValue(null);

      const result = await service.get('nonexistent-key');

      expect(result).toBeNull();
    });
  });

  describe('setEx', () => {
    it('成功设置值并设置过期时间', async () => {
      mockSetEx.mockResolvedValue('OK');

      const result = await service.setEx('test-key', 300, 'test-value');

      expect(mockSetEx).toHaveBeenCalledWith('test-key', 300, 'test-value');
    });
  });

  describe('del', () => {
    it('成功删除键', async () => {
      mockDel.mockResolvedValue(1);

      const result = await service.del('test-key');

      expect(result).toBe(1);
      expect(mockDel).toHaveBeenCalledWith('test-key');
    });

    it('删除不存在的键返回 0', async () => {
      mockDel.mockResolvedValue(0);

      const result = await service.del('nonexistent-key');

      expect(result).toBe(0);
    });
  });

  describe('checkAndIncrementReservationCount', () => {
    it('成功增加预订计数（未满）', async () => {
      mockEval.mockResolvedValue([1, 10, 1, 'ok']);

      const result = await service.checkAndIncrementReservationCount(
        'table-2',
        'slot-lunch',
        '2024-12-01',
        10,
        3600,
      );

      expect(result).toEqual([1, 10, 1, 'ok']);
      expect(mockEval).toHaveBeenCalledWith(
        expect.any(String),
        { keys: ['table-2:slot-lunch:2024-12-01'], arguments: ['10', '3600'] },
      );
    });

    it('预订已满时返回失败', async () => {
      mockEval.mockResolvedValue([0, 10, 10, 'fully_booked']);

      const result = await service.checkAndIncrementReservationCount(
        'table-2',
        'slot-lunch',
        '2024-12-01',
        10,
        3600,
      );

      expect(result).toEqual([0, 10, 10, 'fully_booked']);
    });

    it('使用默认 TTL', async () => {
      mockEval.mockResolvedValue([1, 10, 1, 'ok']);

      await service.checkAndIncrementReservationCount(
        'table-2',
        'slot-lunch',
        '2024-12-01',
        10,
      );

      expect(mockEval).toHaveBeenCalledWith(
        expect.any(String),
        { keys: ['table-2:slot-lunch:2024-12-01'], arguments: ['10', '172800'] },
      );
    });
  });

  describe('decrementReservationCount', () => {
    it('成功减少预订计数', async () => {
      mockEval.mockResolvedValue([1, 9, 'ok']);

      const result = await service.decrementReservationCount(
        'table-2',
        'slot-lunch',
        '2024-12-01',
      );

      expect(result).toEqual([1, 9, 'ok']);
      expect(mockEval).toHaveBeenCalledWith(
        expect.any(String),
        { keys: ['table-2:slot-lunch:2024-12-01'], arguments: [] },
      );
    });

    it('计数已为0时返回失败', async () => {
      mockEval.mockResolvedValue([0, 0, 'already_zero']);

      const result = await service.decrementReservationCount(
        'table-2',
        'slot-lunch',
        '2024-12-01',
      );

      expect(result).toEqual([0, 0, 'already_zero']);
    });
  });
});
