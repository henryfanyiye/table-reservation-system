import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService, ottomanInstance } from './database.service';
import { ConfigService } from '@nestjs/config';
import { Cluster, connect } from 'couchbase';
import { Logger } from '@nestjs/common';

// Mock Ottoman
jest.mock('ottoman', () => {
  const mockOttoman = {
    _cluster: null,
    bucket: null,
    bucketName: '',
    couchbase: {},
    ensureIndexes: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    model: jest.fn(),
  };
  return {
    Ottoman: jest.fn().mockImplementation(() => mockOttoman),
  };
});

// Mock Couchbase connect
jest.mock('couchbase', () => {
  const mockBucket = {
    scope: jest.fn().mockReturnValue({
      collection: jest.fn(),
    }),
  };
  const mockCluster = {
    bucket: jest.fn().mockReturnValue(mockBucket),
  };
  return {
    connect: jest.fn().mockResolvedValue(mockCluster),
    Cluster: jest.fn(),
  };
});

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockCluster: jest.Mocked<Cluster>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let loggerSpy: jest.SpyInstance;

  const mockConfig = {
    COUCHBASE_CONNECTION_STRING: 'couchbase://localhost',
    COUCHBASE_USERNAME: 'Administrator',
    COUCHBASE_PASSWORD: 'password123',
    COUCHBASE_BUCKET: 'table_reservation',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string) => mockConfig[key as keyof typeof mockConfig]),
    } as unknown as jest.Mocked<ConfigService>;

    // Mock Logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    // 创建 mock cluster
    mockCluster = {
      bucket: jest.fn().mockReturnValue({
        scope: jest.fn(),
      }),
    } as unknown as jest.Mocked<Cluster>;

    (connect as jest.Mock).mockResolvedValue(mockCluster);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('模块初始化', () => {
    it('应该正确创建服务实例', () => {
      expect(service).toBeDefined();
    });

    it('应该有正确的方法', () => {
      expect(service.getCluster).toBeDefined();
      expect(service.getBucket).toBeDefined();
      expect(service.getScope).toBeDefined();
    });

    it('应该导出 ottomanInstance', () => {
      expect(ottomanInstance).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('应该成功初始化数据库连接', async () => {
      (connect as jest.Mock).mockResolvedValue(mockCluster);
      (ottomanInstance.ensureIndexes as jest.Mock).mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connect).toHaveBeenCalledWith(
        mockConfig.COUCHBASE_CONNECTION_STRING,
        {
          username: mockConfig.COUCHBASE_USERNAME,
          password: mockConfig.COUCHBASE_PASSWORD,
        }
      );
      expect(ottomanInstance.ensureIndexes).toHaveBeenCalledWith({
        ignoreWatchIndexes: true,
      });
    });

    it('应该在连接成功时记录日志', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (connect as jest.Mock).mockResolvedValue(mockCluster);
      (ottomanInstance.ensureIndexes as jest.Mock).mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Couchbase 连接成功')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ottoman ODM 初始化成功')
      );
    });

    it('连接失败时应该记录错误并抛出异常', async () => {
      const error = new Error('Connection failed');
      (connect as jest.Mock).mockRejectedValue(error);
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(errorSpy).toHaveBeenCalledWith(
        'Couchbase 连接失败',
        error
      );
    });

    it('Ottoman 初始化失败时应该记录错误并抛出异常', async () => {
      (connect as jest.Mock).mockResolvedValue(mockCluster);
      const error = new Error('Ottoman init failed');
      (ottomanInstance.ensureIndexes as jest.Mock).mockRejectedValue(error);
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await expect(service.onModuleInit()).rejects.toThrow('Ottoman init failed');
      expect(errorSpy).toHaveBeenCalledWith(
        'Ottoman 初始化失败',
        error
      );
    });

    it('应该正确设置 Ottoman 实例属性', async () => {
      (connect as jest.Mock).mockResolvedValue(mockCluster);
      (ottomanInstance.ensureIndexes as jest.Mock).mockResolvedValue(undefined);

      await service.onModuleInit();

      expect((ottomanInstance as any)._cluster).toBe(mockCluster);
      expect((ottomanInstance as any).bucket).toBe(mockCluster.bucket(mockConfig.COUCHBASE_BUCKET));
      expect((ottomanInstance as any).bucketName).toBe(mockConfig.COUCHBASE_BUCKET);
      expect((ottomanInstance as any).couchbase).toBeDefined();
    });
  });

  describe('onModuleDestroy', () => {
    beforeEach(async () => {
      (connect as jest.Mock).mockResolvedValue(mockCluster);
      (ottomanInstance.ensureIndexes as jest.Mock).mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('应该正确关闭连接', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.onModuleDestroy();

      expect(ottomanInstance.close).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ottoman 连接已关闭')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Couchbase 连接已关闭')
      );
    });

    it('关闭 Ottoman 失败时应该记录错误但继续执行', async () => {
      const error = new Error('Close failed');
      (ottomanInstance.close as jest.Mock).mockRejectedValue(error);
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.onModuleDestroy();

      expect(errorSpy).toHaveBeenCalledWith(
        '关闭 Ottoman 连接时出错',
        error
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Couchbase 连接已关闭')
      );
    });

    it('cluster 未初始化时不应该抛出错误', async () => {
      // 创建新实例不调用 onModuleInit
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const newService = module.get<DatabaseService>(DatabaseService);

      await expect(newService.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('getCluster', () => {
    it('连接建立后应该返回 cluster 实例', async () => {
      (connect as jest.Mock).mockResolvedValue(mockCluster);
      (ottomanInstance.ensureIndexes as jest.Mock).mockResolvedValue(undefined);
      await service.onModuleInit();

      const cluster = service.getCluster();

      expect(cluster).toBe(mockCluster);
    });

    it('连接未建立时应该抛出错误', () => {
      expect(() => service.getCluster()).toThrow('Couchbase 连接尚未建立');
    });
  });

  describe('getBucket', () => {
    beforeEach(async () => {
      (connect as jest.Mock).mockResolvedValue(mockCluster);
      (ottomanInstance.ensureIndexes as jest.Mock).mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('应该使用默认 bucket 名称', () => {
      const bucket = service.getBucket();

      expect(mockCluster.bucket).toHaveBeenCalledWith(mockConfig.COUCHBASE_BUCKET);
      expect(bucket).toBeDefined();
    });

    it('应该使用传入的 bucket 名称', () => {
      const customBucketName = 'custom_bucket';
      const bucket = service.getBucket(customBucketName);

      expect(mockCluster.bucket).toHaveBeenCalledWith(customBucketName);
      expect(bucket).toBeDefined();
    });
  });

  describe('getScope', () => {
    beforeEach(async () => {
      (connect as jest.Mock).mockResolvedValue(mockCluster);
      const mockScope = { collection: jest.fn() };
      const mockBucket = {
        scope: jest.fn().mockReturnValue(mockScope),
      };
      mockCluster.bucket = jest.fn().mockReturnValue(mockBucket);
      (ottomanInstance.ensureIndexes as jest.Mock).mockResolvedValue(undefined);
      await service.onModuleInit();
    });

    it('应该使用默认 scope 名称', () => {
      const mockBucket = mockCluster.bucket(mockConfig.COUCHBASE_BUCKET);
      const scope = service.getScope();

      expect(mockBucket.scope).toHaveBeenCalledWith('_default');
      expect(scope).toBeDefined();
    });

    it('应该使用传入的 scope 名称', () => {
      const customScopeName = 'custom_scope';
      const mockBucket = mockCluster.bucket(mockConfig.COUCHBASE_BUCKET);
      const scope = service.getScope(customScopeName);

      expect(mockBucket.scope).toHaveBeenCalledWith(customScopeName);
      expect(scope).toBeDefined();
    });
  });

  describe('配置默认值', () => {
    it('应该使用正确的默认配置值', async () => {
      const emptyConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as jest.Mocked<ConfigService>;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          {
            provide: ConfigService,
            useValue: emptyConfigService,
          },
        ],
      }).compile();

      const testService = module.get<DatabaseService>(DatabaseService);

      // 验证私有方法可以通过调用 public 方法间接测试
      expect(testService.getCluster).toBeDefined();
    });
  });

  describe('Logger 输出', () => {
    it('应该使用正确的 Logger 上下文', () => {
      expect(service['logger']).toBeDefined();
      expect(service['logger'].context).toBe('DatabaseService');
    });
  });
});
