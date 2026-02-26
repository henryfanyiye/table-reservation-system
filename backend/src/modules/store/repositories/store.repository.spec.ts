import { Test, TestingModule } from '@nestjs/testing';
import { StoreRepository } from './store.repository';
import { IStore, StoreModel } from '../models/store.model';
import { DatabaseService } from '@common/database/database.service';
import { DocumentNotFoundError } from 'ottoman';
import { Logger } from '@nestjs/common';

describe('StoreRepository', () => {
  let repository: StoreRepository;
  let logger: jest.Mocked<Logger>;

  const mockStore: IStore = {
    id: '507f1f77bcf86cd799439011',
    name: '希尔顿餐厅',
    address: '北京市朝阳区建国路93号',
    phone: '010-12345678',
    description: '高端西餐厅',
    tableConfig: [
      { id: 'table-2', name: '2人桌', seats: 2, count: 10 },
      { id: 'table-4', name: '4人桌', seats: 4, count: 8 },
      { id: 'table-6', name: '6人桌', seats: 6, count: 5 },
      { id: 'table-8', name: '8人桌', seats: 8, count: 3 },
    ],
    timeSlotConfig: [
      {
        id: 'slot-lunch',
        name: '午餐时段',
        startTime: '11:00',
        endTime: '14:00',
        enabled: true,
      },
      {
        id: 'slot-dinner',
        name: '晚餐时段',
        startTime: '17:00',
        endTime: '21:00',
        enabled: true,
      },
    ],
    bookingRules: {
      minDaysAdvance: 0,
      maxDaysAdvance: 30,
    },
    lastConfigUpdatedBy: 'admin123',
    lastConfigUpdatedAt: new Date('2024-06-15T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-15T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      getCluster: jest.fn(),
      getBucket: jest.fn(),
      getScope: jest.fn(),
    } as unknown as jest.Mocked<DatabaseService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    repository = module.get<StoreRepository>(StoreRepository);

    // Mock Logger
    logger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    (repository as any).logger = logger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('成功根据 ID 查找门店', async () => {
      jest.spyOn(StoreModel, 'findById').mockResolvedValue(mockStore as any);

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockStore);
    });

    it('ID 不存在时返回 null 并记录警告日志', async () => {
      const error = new DocumentNotFoundError('Document not found');
      jest.spyOn(StoreModel, 'findById').mockRejectedValue(error);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'findById failed for id: nonexistent-id',
        error
      );
    });
  });

  describe('updateConfig', () => {
    it('成功更新门店配置', async () => {
      const updatedStore = {
        ...mockStore,
        name: '更新后的餐厅',
        lastConfigUpdatedBy: 'admin456',
        lastConfigUpdatedAt: expect.any(Date),
      };

      const mockInstance = {
        ...mockStore,
        save: jest.fn().mockResolvedValue(updatedStore),
      };
      jest.spyOn(StoreModel, 'findById').mockResolvedValue(mockInstance as any);

      const result = await repository.updateConfig(
        '507f1f77bcf86cd799439011',
        {
          name: '更新后的餐厅',
          address: '上海市浦东新区',
        },
        'admin456',
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe('更新后的餐厅');
    });

    it('更新不存在的门店时返回 null 并记录错误日志', async () => {
      const error = new DocumentNotFoundError('Document not found');
      jest.spyOn(StoreModel, 'findById').mockRejectedValue(error);

      const result = await repository.updateConfig(
        'nonexistent-id',
        { name: '新名称' },
      );

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'updateConfig failed for id: nonexistent-id',
        error
      );
    });
  });

  describe('日志记录', () => {
    it('findById 失败时记录警告日志', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(StoreModel, 'findById').mockRejectedValue(error);

      await repository.findById('nonexistent-id');

      expect(logger.warn).toHaveBeenCalledWith(
        'findById failed for id: nonexistent-id',
        error
      );
    });

    it('updateConfig 失败时记录错误日志', async () => {
      const error = new Error('Update failed');
      jest.spyOn(StoreModel, 'findById').mockRejectedValue(error);

      await repository.updateConfig('some-id', { name: '新名称' });

      expect(logger.error).toHaveBeenCalledWith(
        'updateConfig failed for id: some-id',
        error
      );
    });
  });

  describe('create', () => {
    it('成功创建门店', async () => {
      const newStoreData = {
        name: '新餐厅',
        address: '深圳市南山区',
        phone: '0755-12345678',
      };

      jest.spyOn(StoreModel, 'create').mockResolvedValue({
        ...newStoreData,
        id: 'new-id',
      } as any);

      const result = await repository.create(newStoreData);

      expect(result).toBeDefined();
      expect(result.name).toBe(newStoreData.name);
    });
  });

  describe('findAll', () => {
    it('成功获取所有门店', async () => {
      const mockStores = [mockStore, { ...mockStore, id: '507f1f77bcf86cd799439012' }];
      const mockData = {
        rows: mockStores,
      };
      jest.spyOn(StoreModel, 'find').mockResolvedValue(mockData as any);

      const result = await repository.findAll();

      expect(result).toEqual(mockStores);
      expect(result).toHaveLength(2);
    });

    it('没有门店时返回空数组', async () => {
      const mockData = {
        rows: [],
      };
      jest.spyOn(StoreModel, 'find').mockResolvedValue(mockData as any);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });
});
