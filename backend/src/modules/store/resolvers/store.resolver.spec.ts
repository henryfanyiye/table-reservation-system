import { Test, TestingModule } from '@nestjs/testing';
import { StoreResolver } from './store.resolver';
import { StoreService } from '../store.service';
import { UpdateStoreConfigInput } from '@/common/dto/update-store-config.dto';
import { StoreOutput } from '@/common/dto/store-output.dto';

describe('StoreResolver', () => {
  let resolver: StoreResolver;
  let storeService: jest.Mocked<StoreService>;

  const mockStore = {
    _id: '507f1f77bcf86cd799439011',
    name: '希尔顿餐厅',
    address: '北京市朝阳区',
    phone: '010-12345678',
    description: '高端西餐厅',
    tableConfig: [
      { name: '2人桌', seats: 2, count: 10 },
      { name: '4人桌', seats: 4, count: 8 },
    ],
    timeSlotConfig: [
      { name: '午餐', startTime: '11:00', endTime: '14:00', enabled: true },
      { name: '晚餐', startTime: '17:00', endTime: '21:00', enabled: true },
    ],
    bookingRules: {
      minDaysAdvance: 0,
      maxDaysAdvance: 30,
    },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-15T00:00:00.000Z'),
  };

  const expectedStoreOutput: StoreOutput = {
    id: '507f1f77bcf86cd799439011',
    name: '希尔顿餐厅',
    address: '北京市朝阳区',
    phone: '010-12345678',
    description: '高端西餐厅',
    tableConfig: mockStore.tableConfig,
    timeSlotConfig: mockStore.timeSlotConfig,
    bookingRules: mockStore.bookingRules,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  };

  beforeEach(async () => {
    const mockStoreService = {
      getAllStores: jest.fn(),
      createStore: jest.fn(),
      updateConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreResolver,
        {
          provide: StoreService,
          useValue: mockStoreService,
        },
      ],
    }).compile();

    resolver = module.get<StoreResolver>(StoreResolver);
    storeService = module.get(StoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('stores', () => {
    it('成功获取门店列表', async () => {
      storeService.getAllStores.mockResolvedValue([mockStore]);

      const result = await resolver.stores();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedStoreOutput);
      expect(storeService.getAllStores).toHaveBeenCalledTimes(1);
    });

    it('空门店列表时返回空数组', async () => {
      storeService.getAllStores.mockResolvedValue([]);

      const result = await resolver.stores();

      expect(result).toEqual([]);
      expect(storeService.getAllStores).toHaveBeenCalledTimes(1);
    });

    it('正确格式化多个门店', async () => {
      const mockStores = [
        mockStore,
        {
          ...mockStore,
          _id: '507f1f77bcf86cd799439012',
          name: '分店',
          address: '上海市浦东新区',
        },
      ];
      storeService.getAllStores.mockResolvedValue(mockStores);

      const result = await resolver.stores();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('希尔顿餐厅');
      expect(result[1].name).toBe('分店');
    });
  });

  describe('updateStoreConfig - 创建门店', () => {
    it('成功创建新门店（storeId 为空）', async () => {
      storeService.createStore.mockResolvedValue(mockStore);

      const input: UpdateStoreConfigInput = {
        name: '希尔顿餐厅',
        address: '北京市朝阳区',
        phone: '010-12345678',
        tableConfig: [
          { name: '2人桌', seats: 2, count: 10 },
        ],
      };

      const context = {
        req: { user: { id: 'user123', username: 'admin' } },
      };

      const result = await resolver.updateStoreConfig(null, input, context);

      expect(result).toEqual(expectedStoreOutput);
      expect(storeService.createStore).toHaveBeenCalledWith(
        {
          name: '希尔顿餐厅',
          address: '北京市朝阳区',
          phone: '010-12345678',
          tableConfig: [{ name: '2人桌', seats: 2, count: 10 }],
          timeSlotConfig: undefined,
          bookingRules: undefined,
        },
        'user123',
      );
      expect(storeService.updateConfig).not.toHaveBeenCalled();
    });

    it('无用户上下文时创建门店', async () => {
      storeService.createStore.mockResolvedValue(mockStore);

      const input: UpdateStoreConfigInput = {
        name: '测试餐厅',
        address: '测试地址',
      };

      const context = {};

      await resolver.updateStoreConfig(null, input, context);

      expect(storeService.createStore).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
      );
    });
  });

  describe('updateStoreConfig - 更新门店', () => {
    it('成功更新现有门店（有 storeId）', async () => {
      const updatedStore = { ...mockStore, name: '更新后的餐厅' };
      storeService.updateConfig.mockResolvedValue(updatedStore);

      const input: UpdateStoreConfigInput = {
        name: '更新后的餐厅',
      };

      const context = {
        req: { user: { id: 'user123', username: 'admin' } },
      };

      const result = await resolver.updateStoreConfig('507f1f77bcf86cd799439011', input, context);

      expect(result.name).toBe('更新后的餐厅');
      expect(storeService.updateConfig).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        input,
        'user123',
      );
      expect(storeService.createStore).not.toHaveBeenCalled();
    });
  });

  describe('formatStore', () => {
    it('正确格式化门店数据', async () => {
      storeService.getAllStores.mockResolvedValue([mockStore]);

      const result = await resolver.stores();

      expect(result[0]).toMatchObject({
        id: '507f1f77bcf86cd799439011',
        name: '希尔顿餐厅',
        address: '北京市朝阳区',
        phone: '010-12345678',
        description: '高端西餐厅',
      });
    });

    it('正确转换日期为 ISO 字符串', async () => {
      const testDate = new Date('2024-06-15T12:30:00.000Z');
      const storeWithDate = {
        ...mockStore,
        createdAt: testDate,
        updatedAt: testDate,
      };
      storeService.getAllStores.mockResolvedValue([storeWithDate]);

      const result = await resolver.stores();

      expect(result[0].createdAt).toBe(testDate.toISOString());
      expect(result[0].updatedAt).toBe(testDate.toISOString());
    });
  });

  describe('toISOString - 边界情况', () => {
    it('处理 null 日期', () => {
      const resolverInstance = new StoreResolver(storeService);

      // @ts-expect-error - 测试私有方法
      expect(resolverInstance.toISOString(null)).toBeNull();
    });

    it('处理 undefined 日期', () => {
      const resolverInstance = new StoreResolver(storeService);

      // @ts-expect-error - 测试私有方法
      expect(resolverInstance.toISOString(undefined)).toBeNull();
    });

    it('处理无效日期字符串', () => {
      const resolverInstance = new StoreResolver(storeService);

      // @ts-expect-error - 测试私有方法
      expect(resolverInstance.toISOString('invalid-date')).toBeNull();
    });

    it('处理 Date 对象', () => {
      const resolverInstance = new StoreResolver(storeService);
      const testDate = new Date('2024-06-15T12:30:00.000Z');

      // @ts-expect-error - 测试私有方法
      expect(resolverInstance.toISOString(testDate)).toBe(testDate.toISOString());
    });

    it('处理有效日期字符串', () => {
      const resolverInstance = new StoreResolver(storeService);
      const dateString = '2024-06-15T12:30:00.000Z';

      // @ts-expect-error - 测试私有方法
      expect(resolverInstance.toISOString(dateString)).toBe(dateString);
    });
  });
});
