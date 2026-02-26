import { Test, TestingModule } from '@nestjs/testing';
import { ReservationResolver } from './reservation.resolver';
import { ReservationService } from '../reservation.service';
import { StoreRepository } from '../../store/repositories/store.repository';
import {
  CreateReservationInput,
  ReservationQueryInput,
  UpdateReservationInput,
  UpdateReservationStatusInput,
} from '../../../common/dto/reservation.dto';
import { PaginationInput } from '@common/dto/pagination.dto';
import { ReservationStatus } from '../models/reservation.model';

describe('ReservationResolver', () => {
  let resolver: ReservationResolver;
  let reservationService: jest.Mocked<ReservationService>;
  let storeRepository: jest.Mocked<StoreRepository>;

  const mockStore = {
    _id: 'store123',
    id: 'store123',
    name: '希尔顿餐厅',
    tableConfig: [
      {
        id: 'tableConfig1',
        name: '2人桌',
        count: 10,
        seats: 2,
      },
      {
        id: 'tableConfig2',
        name: '4人桌',
        count: 8,
        seats: 4,
      },
    ],
  };

  const mockReservation = {
    _id: '507f1f77bcf86cd799439011',
    id: '507f1f77bcf86cd799439011',
    customer: {
      name: '张三',
      phone: '138****1234',
      email: 'test@example.com',
    },
    reservationDate: new Date('2024-06-15T00:00:00.000Z'),
    storeId: 'store123',
    storeName: '希尔顿餐厅',
    timeSlot: '18:00-20:00',
    timeSlotName: '晚餐时段',
    tableConfigId: 'tableConfig1',
    tableConfigName: '2人桌',
    tableSize: 2,
    status: ReservationStatus.REQUESTED,
    specialRequests: '靠窗位置',
    estimatedArrivalTime: '18:00',
    confirmedAt: undefined,
    confirmedBy: undefined,
    completedAt: undefined,
    cancelledAt: undefined,
    cancelReason: undefined,
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
    toObject: jest.fn(function (this: any) {
      return { ...this };
    }),
  };

  beforeEach(async () => {
    const mockReservationService = {
      findAll: jest.fn(),
      createReservation: jest.fn(),
      updateReservation: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockStoreRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationResolver,
        {
          provide: ReservationService,
          useValue: mockReservationService,
        },
        {
          provide: StoreRepository,
          useValue: mockStoreRepo,
        },
      ],
    }).compile();

    resolver = module.get<ReservationResolver>(ReservationResolver);
    reservationService = module.get(ReservationService);
    storeRepository = module.get(StoreRepository);

    // 默认 mock 配置
    storeRepository.findById.mockResolvedValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reservations - 查询预订列表', () => {
    it('成功获取预订列表（无查询参数）', async () => {
      const mockResult = {
        data: [mockReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result).toMatchObject({
        data: expect.any(Array),
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
      expect(result.data).toHaveLength(1);
      expect(reservationService.findAll).toHaveBeenCalledWith({}, { page: 1, limit: 20 });
    });

    it('成功获取预订列表（带查询参数）', async () => {
      const query: ReservationQueryInput = {
        status: [ReservationStatus.REQUESTED],
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
      };

      const pagination: PaginationInput = {
        page: 2,
        limit: 10,
      };

      const mockResult = {
        data: [mockReservation],
        pageInfo: {
          total: 1,
          page: 2,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations(query, pagination);

      expect(reservationService.findAll).toHaveBeenCalledWith(
        {
          status: [ReservationStatus.REQUESTED],
          dateFrom: new Date('2024-06-01'),
          dateTo: new Date('2024-06-30'),
        },
        { page: 2, limit: 10 },
      );
      expect(result.pageInfo.page).toBe(2);
      expect(result.pageInfo.limit).toBe(10);
    });

    it('正确格式化预订数据', async () => {
      const mockResult = {
        data: [mockReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0]).toMatchObject({
        id: '507f1f77bcf86cd799439011',
        customer: {
          name: '张三',
          phone: '138****1234',
          email: 'test@example.com',
        },
        reservationDate: '2024-06-15',
        timeSlot: '18:00-20:00',
        timeSlotName: '晚餐时段',
        tableConfigId: 'tableConfig1',
        tableConfigName: '2人桌',
        storeId: 'store123',
        storeName: '希尔顿餐厅',
        status: ReservationStatus.REQUESTED,
      });
    });

    it('空预订列表时返回空数组', async () => {
      const mockResult = {
        data: [],
        pageInfo: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data).toEqual([]);
      expect(result.pageInfo.total).toBe(0);
    });
  });

  describe('createReservation - 创建预订', () => {
    it('成功创建预订', async () => {
      const input: CreateReservationInput = {
        customerName: '张三',
        customerPhone: '13800138000',
        verificationCode: '123456',
        customerEmail: 'test@example.com',
        reservationDate: '2024-06-15',
        storeId: 'store123',
        storeName: '希尔顿餐厅',
        timeSlot: '18:00-20:00',
        timeSlotName: '晚餐时段',
        tableConfigId: 'tableConfig1',
        tableConfigName: '2人桌',
        specialRequests: '靠窗位置',
        estimatedArrivalTime: '18:00',
      };

      reservationService.createReservation.mockResolvedValue(mockReservation);

      const result = await resolver.createReservation(input, {});

      // createReservation 现在接受 input 和可选的 userId 参数
      expect(reservationService.createReservation).toHaveBeenCalledWith(input, undefined);
      expect(result).toMatchObject({
        id: '507f1f77bcf86cd799439011',
        customer: {
          name: '张三',
          phone: '138****1234',
        },
        status: ReservationStatus.REQUESTED,
      });
    });

    it('成功创建预订（带 userId）', async () => {
      const input: CreateReservationInput = {
        customerName: '张三',
        customerPhone: '13800138000',
        verificationCode: '123456',
        customerEmail: 'test@example.com',
        reservationDate: '2024-06-15',
        storeId: 'store123',
        storeName: '希尔顿餐厅',
        timeSlot: '18:00-20:00',
        timeSlotName: '晚餐时段',
        tableConfigId: 'tableConfig1',
        tableConfigName: '2人桌',
        specialRequests: '靠窗位置',
        estimatedArrivalTime: '18:00',
      };

      const reservationWithUserId = { ...mockReservation, userId: 'user123' };
      reservationService.createReservation.mockResolvedValue(reservationWithUserId);

      const context = {
        req: { user: { id: 'user123', username: 'testuser' } },
      };

      const result = await resolver.createReservation(input, context);

      expect(reservationService.createReservation).toHaveBeenCalledWith(input, 'user123');
      expect(result.userId).toBe('user123');
    });
  });

  describe('updateReservation - 更新预订信息', () => {
    it('成功更新预订信息', async () => {
      const input: UpdateReservationInput = {
        reservationId: '507f1f77bcf86cd799439011',
        reservationDate: '2024-06-16',
        timeSlot: '19:00-21:00',
        timeSlotName: '晚餐时段',
        tableConfigId: 'tableConfig2',
        tableConfigName: '4人桌',
        specialRequests: '包间',
        estimatedArrivalTime: '19:00',
      };

      const updatedReservation = {
        ...mockReservation,
        reservationDate: new Date('2024-06-16T00:00:00.000Z'),
        timeSlot: '19:00-21:00',
        timeSlotName: '晚餐时段',
        tableConfigId: 'tableConfig2',
        tableConfigName: '4人桌',
        specialRequests: '包间',
        estimatedArrivalTime: '19:00',
      };

      reservationService.updateReservation.mockResolvedValue(updatedReservation);

      const result = await resolver.updateReservation(input);

      expect(reservationService.updateReservation).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          reservationDate: '2024-06-16',
          timeSlot: '19:00-21:00',
          timeSlotName: '晚餐时段',
          tableConfigId: 'tableConfig2',
          tableConfigName: '4人桌',
          specialRequests: '包间',
          estimatedArrivalTime: '19:00',
        },
      );
      expect(result.reservationDate).toBe('2024-06-16');
      expect(result.timeSlot).toBe('19:00-21:00');
    });

    it('部分更新预订信息', async () => {
      const input: UpdateReservationInput = {
        reservationId: '507f1f77bcf86cd799439011',
        specialRequests: '需要儿童座椅',
      };

      const updatedReservation = {
        ...mockReservation,
        specialRequests: '需要儿童座椅',
      };

      reservationService.updateReservation.mockResolvedValue(updatedReservation);

      const result = await resolver.updateReservation(input);

      expect(reservationService.updateReservation).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          specialRequests: '需要儿童座椅',
        },
      );
      expect(result.specialRequests).toBe('需要儿童座椅');
    });
  });

  describe('updateReservationStatus - 更新预订状态', () => {
    it('成功更新预订状态为已确认', async () => {
      const input: UpdateReservationStatusInput = {
        reservationId: '507f1f77bcf86cd799439011',
        status: ReservationStatus.APPROVED,
      };

      const context = {
        req: { user: { id: 'user123', username: 'admin' } },
      };

      const updatedReservation = {
        ...mockReservation,
        status: ReservationStatus.APPROVED,
        confirmedAt: new Date(),
        confirmedBy: 'user123',
      };

      reservationService.updateStatus.mockResolvedValue(updatedReservation);

      const result = await resolver.updateReservationStatus(input, context);

      expect(reservationService.updateStatus).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        ReservationStatus.APPROVED,
        undefined,
        'user123',
      );
      expect(result.status).toBe(ReservationStatus.APPROVED);
      expect(result.confirmedBy).toBe('user123');
    });

    it('成功更新预订状态为已取消（含原因）', async () => {
      const input: UpdateReservationStatusInput = {
        reservationId: '507f1f77bcf86cd799439011',
        status: ReservationStatus.CANCELLED,
        reason: '客人临时有事',
      };

      const context = {
        req: { user: { id: 'user123' } },
      };

      const updatedReservation = {
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: 'user123',
        cancelReason: '客人临时有事',
      };

      reservationService.updateStatus.mockResolvedValue(updatedReservation);

      const result = await resolver.updateReservationStatus(input, context);

      expect(reservationService.updateStatus).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        ReservationStatus.CANCELLED,
        '客人临时有事',
        'user123',
      );
      expect(result.status).toBe(ReservationStatus.CANCELLED);
      expect(result.cancelReason).toBe('客人临时有事');
    });

    it('无用户上下文时更新状态', async () => {
      const input: UpdateReservationStatusInput = {
        reservationId: '507f1f77bcf86cd799439011',
        status: ReservationStatus.COMPLETED,
      };

      const context = {};

      const updatedReservation = {
        ...mockReservation,
        status: ReservationStatus.COMPLETED,
        completedAt: new Date(),
      };

      reservationService.updateStatus.mockResolvedValue(updatedReservation);

      await resolver.updateReservationStatus(input, context);

      expect(reservationService.updateStatus).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        ReservationStatus.COMPLETED,
        undefined,
        undefined,
      );
    });
  });

  describe('convertQueryInput - 私有方法测试', () => {
    it('正确转换空查询输入', async () => {
      const mockResult = {
        data: [mockReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      await resolver.reservations({});

      expect(reservationService.findAll).toHaveBeenCalledWith({}, { page: 1, limit: 20 });
    });

    it('正确转换完整查询输入', async () => {
      const query: ReservationQueryInput = {
        status: [ReservationStatus.REQUESTED, ReservationStatus.APPROVED],
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
        phone: '13800138000',
        name: '张三',
        timeSlot: '18:00-20:00',
        tableSize: 4,
        source: 'web',
        storeId: 'store123',
      };

      const mockResult = {
        data: [mockReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      await resolver.reservations(query);

      expect(reservationService.findAll).toHaveBeenCalledWith(
        {
          status: [ReservationStatus.REQUESTED, ReservationStatus.APPROVED],
          dateFrom: new Date('2024-06-01'),
          dateTo: new Date('2024-06-30'),
          phone: '13800138000',
          name: '张三',
          timeSlot: '18:00-20:00',
          tableSize: 4,
          source: 'web',
          storeId: 'store123',
        },
        { page: 1, limit: 20 },
      );
    });
  });

  describe('formatDate - 私有方法测试', () => {
    it('正确格式化 Date 对象', async () => {
      const testReservation = {
        ...mockReservation,
        reservationDate: new Date('2024-06-15T12:30:00.000Z'),
      };

      const mockResult = {
        data: [testReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].reservationDate).toBe('2024-06-15');
    });

    it('处理空日期时返回空字符串', async () => {
      const testReservation = {
        ...mockReservation,
        reservationDate: null,
      };

      const mockResult = {
        data: [testReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].reservationDate).toBe('');
    });
  });

  describe('formatReservation - 私有方法测试', () => {
    it('正确包含门店和桌型信息', async () => {
      const mockResult = {
        data: [mockReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0]).toMatchObject({
        storeName: '希尔顿餐厅',
        tableConfigName: '2人桌',
      });
      expect(storeRepository.findById).toHaveBeenCalledWith('store123');
    });

    it('处理无门店配置的情况', async () => {
      storeRepository.findById.mockResolvedValue(null);

      const mockResult = {
        data: [mockReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].storeName).toBeUndefined();
      expect(result.data[0].tableConfigName).toBeUndefined();
    });

    it('处理无 tableConfigId 的情况', async () => {
      const testReservation = {
        ...mockReservation,
        tableConfigId: undefined,
      };

      const mockResult = {
        data: [testReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].tableConfigName).toBeUndefined();
    });

    it('处理 tableConfig 找不到匹配 ID 的情况', async () => {
      const testReservation = {
        ...mockReservation,
        tableConfigId: 'nonExistentTableId',
      };

      const mockResult = {
        data: [testReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].tableConfigName).toBeUndefined();
      expect(storeRepository.findById).toHaveBeenCalledWith('store123');
    });

    it('处理没有 toObject 方法的对象', async () => {
      const plainReservation = {
        _id: '507f1f77bcf86cd799439011',
        customer: {
          name: '李四',
          phone: '139****5678',
          email: 'lisi@example.com',
        },
        reservationDate: new Date('2024-06-20T00:00:00.000Z'),
        storeId: 'store123',
        timeSlot: '12:00-14:00',
        timeSlotName: '午餐时段',
        tableConfigId: 'tableConfig1',
        tableSize: 2,
        status: ReservationStatus.APPROVED,
        confirmedAt: new Date(),
        confirmedBy: 'admin',
        completedAt: undefined,
        cancelledAt: undefined,
        cancelReason: undefined,
        createdAt: new Date('2024-06-01T00:00:00.000Z'),
        updatedAt: new Date('2024-06-01T00:00:00.000Z'),
      };

      const mockResult = {
        data: [plainReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].id).toBe('507f1f77bcf86cd799439011');
      expect(result.data[0].customer.name).toBe('李四');
    });

    it('处理没有 _id 的对象', async () => {
      const noIdReservation = {
        ...mockReservation,
        _id: undefined,
        id: undefined,
      };

      const mockResult = {
        data: [noIdReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].id).toBe('');
    });

    it('处理没有 customer 字段的对象', async () => {
      const noCustomerReservation = {
        ...mockReservation,
        customer: undefined,
      };

      const mockResult = {
        data: [noCustomerReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].customer.name).toBe('');
      expect(result.data[0].customer.phone).toBe('');
      expect(result.data[0].customer.email).toBe('');
    });

    it('并行格式化多个预订', async () => {
      const mockReservations = [
        mockReservation,
        {
          ...mockReservation,
          _id: '507f1f77bcf86cd799439012',
          id: '507f1f77bcf86cd799439012',
          customer: {
            ...mockReservation.customer,
            name: '王五',
          },
        },
        {
          ...mockReservation,
          _id: '507f1f77bcf86cd799439013',
          id: '507f1f77bcf86cd799439013',
          customer: {
            ...mockReservation.customer,
            name: '赵六',
          },
        },
      ];

      const mockResult = {
        data: mockReservations,
        pageInfo: {
          total: 3,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data).toHaveLength(3);
      expect(result.data[0].customer.name).toBe('张三');
      expect(result.data[1].customer.name).toBe('王五');
      expect(result.data[2].customer.name).toBe('赵六');
    });
  });

  describe('formatDate - 私有方法边界测试', () => {
    it('处理字符串类型的日期', async () => {
      const stringDateReservation = {
        ...mockReservation,
        reservationDate: '2024-06-15',
      };

      const mockResult = {
        data: [stringDateReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].reservationDate).toBe('2024-06-15');
    });

    it('处理 undefined 日期', async () => {
      const undefinedDateReservation = {
        ...mockReservation,
        reservationDate: undefined,
      };

      const mockResult = {
        data: [undefinedDateReservation],
        pageInfo: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      reservationService.findAll.mockResolvedValue(mockResult);

      const result = await resolver.reservations();

      expect(result.data[0].reservationDate).toBe('');
    });
  });

  describe('updateReservation - 边界情况测试', () => {
    it('所有可选字段都为 undefined', async () => {
      const input: UpdateReservationInput = {
        reservationId: '507f1f77bcf86cd799439011',
      };

      const updatedReservation = { ...mockReservation };

      reservationService.updateReservation.mockResolvedValue(updatedReservation);

      const result = await resolver.updateReservation(input);

      expect(reservationService.updateReservation).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          reservationDate: undefined,
          timeSlot: undefined,
          timeSlotName: undefined,
          tableConfigId: undefined,
          tableConfigName: undefined,
          specialRequests: undefined,
          estimatedArrivalTime: undefined,
        },
      );
    });
  });

  describe('updateReservationStatus - 边界情况测试', () => {
    it('context.req 存在但 user 不存在', async () => {
      const input: UpdateReservationStatusInput = {
        reservationId: '507f1f77bcf86cd799439011',
        status: ReservationStatus.COMPLETED,
      };

      const context = {
        req: {},
      };

      const updatedReservation = {
        ...mockReservation,
        status: ReservationStatus.COMPLETED,
        completedAt: new Date(),
      };

      reservationService.updateStatus.mockResolvedValue(updatedReservation);

      await resolver.updateReservationStatus(input, context);

      expect(reservationService.updateStatus).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        ReservationStatus.COMPLETED,
        undefined,
        undefined,
      );
    });
  });
});
