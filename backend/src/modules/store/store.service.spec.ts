import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreRepository } from './repositories/store.repository';
import { CreateStoreInput, UpdateStoreConfigInput } from '@/common/dto/update-store-config.dto';

describe('StoreService', () => {
  let service: StoreService;
  let storeRepository: jest.Mocked<StoreRepository>;

  const mockStore = {
    _id: '507f1f77bcf86cd799439011',
    id: '507f1f77bcf86cd799439011',
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockStoreRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      updateConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        {
          provide: StoreRepository,
          useValue: mockStoreRepository,
        },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    storeRepository = module.get(StoreRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('成功获取门店', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockStore);
      expect(storeRepository.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });
  });

  describe('getAllStores', () => {
    it('成功获取所有门店', async () => {
      storeRepository.findAll.mockResolvedValue([mockStore]);

      const result = await service.getAllStores();

      expect(result).toEqual([mockStore]);
      expect(storeRepository.findAll).toHaveBeenCalled();
    });

    it('无门店时返回空数组', async () => {
      storeRepository.findAll.mockResolvedValue([]);

      const result = await service.getAllStores();

      expect(result).toEqual([]);
      expect(storeRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('createStore', () => {
    it('成功创建门店', async () => {
      storeRepository.create.mockResolvedValue(mockStore);

      const input: CreateStoreInput = {
        name: '希尔顿餐厅',
        address: '北京市朝阳区',
        phone: '010-12345678',
        tableConfig: [
          { name: '2人桌', seats: 2, count: 10 },
        ],
      };

      const result = await service.createStore(input, 'user123');

      expect(result).toEqual(mockStore);
      expect(storeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '希尔顿餐厅',
          address: '北京市朝阳区',
          phone: '010-12345678',
          tableConfig: [{ name: '2人桌', seats: 2, count: 10 }],
          bookingRules: { minDaysAdvance: 0, maxDaysAdvance: 30 },
        }),
      );
    });

    it('创建门店时使用默认预订规则', async () => {
      storeRepository.create.mockResolvedValue(mockStore);

      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
      };

      await service.createStore(input);

      expect(storeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingRules: { minDaysAdvance: 0, maxDaysAdvance: 30 },
        }),
      );
    });

    it('桌型数量为0时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        tableConfig: [{ name: '2人桌', seats: 2, count: 0 }],
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('桌型 2人桌 的数量必须大于 0'),
      );
    });

    it('座位数为0时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        tableConfig: [{ name: '2人桌', seats: 0, count: 5 }],
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('桌型 2人桌 的座位数必须大于 0'),
      );
    });

    it('座位数重复时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        tableConfig: [
          { name: '2人桌', seats: 2, count: 5 },
          { name: '小桌', seats: 2, count: 3 },
        ],
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('座位数 2 重复定义'),
      );
    });

    it('时段时间格式无效时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        timeSlotConfig: [{ name: '午餐', startTime: '25:00', endTime: '14:00', enabled: true }],
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('时段 午餐 的开始时间格式无效'),
      );
    });

    it('结束时间早于开始时间时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        timeSlotConfig: [{ name: '午餐', startTime: '14:00', endTime: '11:00', enabled: true }],
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('时段 午餐 的结束时间必须晚于开始时间'),
      );
    });

    it('时段重叠时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        timeSlotConfig: [
          { name: '午餐', startTime: '11:00', endTime: '14:00', enabled: true },
          { name: '早午餐', startTime: '12:00', endTime: '13:00', enabled: true },
        ],
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('时段 午餐 与 早午餐 存在时间重叠'),
      );
    });

    it('预订规则最小值为负数时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        bookingRules: { minDaysAdvance: -1 },
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('最少提前预订天数不能为负数'),
      );
    });

    it('预订规则最大值不大于0时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        bookingRules: { maxDaysAdvance: 0 },
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('最多提前预订天数必须大于 0'),
      );
    });

    it('最小值大于最大值时抛出异常', async () => {
      const input: CreateStoreInput = {
        name: '测试餐厅',
        address: '测试地址',
        bookingRules: { minDaysAdvance: 30, maxDaysAdvance: 15 },
      };

      await expect(service.createStore(input)).rejects.toThrow(
        new ConflictException('最少提前预订天数不能大于最多提前预订天数'),
      );
    });
  });

  describe('updateConfig', () => {
    it('成功更新门店配置', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);
      storeRepository.updateConfig.mockResolvedValue(mockStore);

      const updates: UpdateStoreConfigInput = {
        name: '希尔顿餐厅（更新）',
      };

      const result = await service.updateConfig('507f1f77bcf86cd799439011', updates, 'user123');

      expect(result).toEqual(mockStore);
      expect(storeRepository.updateConfig).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updates,
        'user123',
      );
    });

    it('门店不存在时抛出异常', async () => {
      storeRepository.findById.mockResolvedValue(null);

      const updates: UpdateStoreConfigInput = {
        name: '更新名称',
      };

      await expect(
        service.updateConfig('nonexistent-id', updates),
      ).rejects.toThrow(new NotFoundException('门店不存在'));
    });
  });
});
