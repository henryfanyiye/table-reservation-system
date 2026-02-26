import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationRepository } from './repositories/reservation.repository';
import { StoreRepository } from '../store/repositories/store.repository';
import { SmsService } from '../sms/sms.service';
import { RedisService } from '@common/redis/redis.service';
import { ReservationStatus } from './models/reservation.model';
import { CreateReservationInput } from '@/common/interfaces/create-reservation-interface';

describe('ReservationService', () => {
  let service: ReservationService;
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let storeRepository: jest.Mocked<StoreRepository>;
  let smsService: jest.Mocked<SmsService>;
  let redisService: jest.Mocked<RedisService>;

  const mockStore = {
    _id: '507f1f77bcf86cd799439011',
    name: '希尔顿餐厅',
    tableConfig: [
      { id: 'table-2', name: '2人桌', seats: 2, count: 10 },
      { id: 'table-4', name: '4人桌', seats: 4, count: 8 },
    ],
    timeSlotConfig: [
      { id: 'slot-lunch', name: '午餐', startTime: '11:00', endTime: '14:00', enabled: true },
      { id: 'slot-dinner', name: '晚餐', startTime: '17:00', endTime: '21:00', enabled: true },
    ],
    bookingRules: {
      minDaysAdvance: 0,
      maxDaysAdvance: 30,
    },
  };

  const mockReservation = {
    _id: '507f1f77bcf86cd799439012',
    id: '507f1f77bcf86cd799439012',
    customer: {
      name: '张三',
      phone: '13800138000',
      email: 'test@example.com',
    },
    reservationDate: new Date('2024-12-01'),
    storeId: '507f1f77bcf86cd799439011',
    storeName: '希尔顿餐厅',
    timeSlot: 'slot-lunch',
    timeSlotName: '午餐',
    tableConfigId: 'table-2',
    tableConfigName: '2人桌',
    status: ReservationStatus.REQUESTED,
  };

  beforeEach(async () => {
    const mockReservationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findDuplicateReservation: jest.fn(),
    };

    const mockStoreRepository = {
      findById: jest.fn(),
    };

    const mockSmsService = {
      verifyCode: jest.fn(),
    };

    const mockRedisService = {
      checkAndIncrementReservationCount: jest.fn(),
      decrementReservationCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: ReservationRepository,
          useValue: mockReservationRepository,
        },
        {
          provide: StoreRepository,
          useValue: mockStoreRepository,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    reservationRepository = module.get(ReservationRepository);
    storeRepository = module.get(StoreRepository);
    smsService = module.get(SmsService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    // 使用动态的未来日期（明天）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDateStr = tomorrow.toISOString().split('T')[0];

    const validInput: CreateReservationInput = {
      customerName: '张三',
      customerPhone: '13800138000',
      customerEmail: 'test@example.com',
      verificationCode: '123456',
      reservationDate: futureDateStr,
      storeId: '507f1f77bcf86cd799439011',
      storeName: '希尔顿餐厅',
      timeSlot: 'slot-lunch',
      timeSlotName: '午餐',
      tableConfigId: 'table-2',
      tableConfigName: '2人桌',
    };

    it('成功创建预订', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);
      reservationRepository.findDuplicateReservation.mockResolvedValue([]);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 10, 1, '']);
      reservationRepository.create.mockResolvedValue(mockReservation);

      const result = await service.createReservation(validInput);

      expect(result).toEqual(mockReservation);
      expect(storeRepository.findById).toHaveBeenCalledWith(validInput.storeId);
      expect(redisService.checkAndIncrementReservationCount).toHaveBeenCalled();
      expect(reservationRepository.create).toHaveBeenCalled();
    });

    it('存在重复预订时抛出异常', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);
      // SMS verification is no longer handled in the service layer
      reservationRepository.findDuplicateReservation.mockResolvedValue([mockReservation]);

      await expect(service.createReservation(validInput)).rejects.toThrow(
        new ConflictException('您已有预订'),
      );
      expect(redisService.checkAndIncrementReservationCount).not.toHaveBeenCalled();
      expect(reservationRepository.create).not.toHaveBeenCalled();
    });

    it('门店不存在时抛出异常', async () => {
      storeRepository.findById.mockResolvedValue(null);

      await expect(service.createReservation(validInput)).rejects.toThrow(
        new NotFoundException('门店配置不存在'),
      );
    });

    it('桌型已订完时抛出异常', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);
      // SMS verification is no longer handled in the service layer
      reservationRepository.findDuplicateReservation.mockResolvedValue([]);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([false, 10, 10, '已订完']);

      await expect(service.createReservation(validInput)).rejects.toThrow(
        new BadRequestException('该桌型已订完'),
      );
      expect(reservationRepository.create).not.toHaveBeenCalled();
    });

    it('桌型不存在时抛出异常', async () => {
      const invalidInput = { ...validInput, tableConfigId: 'invalid-table' };
      storeRepository.findById.mockResolvedValue(mockStore);
      // SMS verification is no longer handled in the service layer
      reservationRepository.findDuplicateReservation.mockResolvedValue([]);

      await expect(service.createReservation(invalidInput)).rejects.toThrow(
        new BadRequestException('无效的桌型配置'),
      );
    });

    it('Couchbase 创建失败时回滚 Redis', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);
      // SMS verification is no longer handled in the service layer
      reservationRepository.findDuplicateReservation.mockResolvedValue([]);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 10, 1, '']);
      reservationRepository.create.mockRejectedValue(new Error('Database error'));
      redisService.decrementReservationCount.mockResolvedValue(1);

      await expect(service.createReservation(validInput)).rejects.toThrow('Database error');
      // 使用实际的日期字符串而不是硬编码的日期
      const expectedDate = service['formatDate'](new Date(validInput.reservationDate));
      expect(redisService.decrementReservationCount).toHaveBeenCalledWith(
        validInput.tableConfigId,
        validInput.timeSlot,
        expectedDate,
      );
    });

    it('成功创建带 userId 的预订', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);
      reservationRepository.findDuplicateReservation.mockResolvedValue([]);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 10, 1, '']);
      const reservationWithUserId = { ...mockReservation, userId: 'user123' };
      reservationRepository.create.mockResolvedValue(reservationWithUserId);

      const result = await service.createReservation(validInput, 'user123');

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
        }),
      );
      expect(result.userId).toBe('user123');
    });

    it('不传 userId 时不设置该字段', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);
      reservationRepository.findDuplicateReservation.mockResolvedValue([]);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 10, 1, '']);
      reservationRepository.create.mockResolvedValue(mockReservation);

      await service.createReservation(validInput);

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          userId: expect.any(String),
        }),
      );
    });

    it('只设置有值的可选字段', async () => {
      storeRepository.findById.mockResolvedValue(mockStore);
      reservationRepository.findDuplicateReservation.mockResolvedValue([]);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 10, 1, '']);
      reservationRepository.create.mockResolvedValue(mockReservation);

      const inputWithoutOptionals = { ...validInput };
      delete (inputWithoutOptionals as any).specialRequests;
      delete (inputWithoutOptionals as any).estimatedArrivalTime;

      await service.createReservation(inputWithoutOptionals);

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          specialRequests: expect.any(String),
          estimatedArrivalTime: expect.any(String),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('成功更新状态为已批准', async () => {
      const requestedReservation = { ...mockReservation, status: ReservationStatus.REQUESTED };
      reservationRepository.findById.mockResolvedValue(requestedReservation);
      reservationRepository.update.mockResolvedValue({
        ...requestedReservation,
        status: ReservationStatus.APPROVED,
      });

      const result = await service.updateStatus(
        mockReservation.id,
        ReservationStatus.APPROVED,
        undefined,
        'admin123',
      );

      expect(reservationRepository.update).toHaveBeenCalledWith(mockReservation.id, {
        status: ReservationStatus.APPROVED,
        confirmedAt: expect.any(Date),
        confirmedBy: 'admin123',
      });
    });

    it('成功更新状态为已取消（释放桌位）', async () => {
      const approvedReservation = { ...mockReservation, status: ReservationStatus.APPROVED };
      reservationRepository.findById.mockResolvedValue(approvedReservation);
      reservationRepository.update.mockResolvedValue({
        ...approvedReservation,
        status: ReservationStatus.CANCELLED,
      });
      redisService.decrementReservationCount.mockResolvedValue(1);

      const result = await service.updateStatus(
        mockReservation.id,
        ReservationStatus.CANCELLED,
        '客人要求取消',
        'admin123',
      );

      expect(reservationRepository.update).toHaveBeenCalledWith(mockReservation.id, {
        status: ReservationStatus.CANCELLED,
        cancelledAt: expect.any(Date),
        cancelledBy: 'admin123',
        cancelReason: '客人要求取消',
      });
      expect(redisService.decrementReservationCount).toHaveBeenCalled();
    });

    it('预订不存在时抛出异常', async () => {
      reservationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent-id', ReservationStatus.APPROVED),
      ).rejects.toThrow(new NotFoundException('预订不存在'));
    });

    it('无效的状态转换时抛出异常', async () => {
      const cancelledReservation = { ...mockReservation, status: ReservationStatus.CANCELLED };
      reservationRepository.findById.mockResolvedValue(cancelledReservation);

      await expect(
        service.updateStatus(mockReservation.id, ReservationStatus.APPROVED),
      ).rejects.toThrow(new BadRequestException('不能从 CANCELLED 转换到 APPROVED'));
    });

    it('从已请求状态更新到已完成（无效转换）', async () => {
      reservationRepository.findById.mockResolvedValue(mockReservation);

      await expect(
        service.updateStatus(mockReservation.id, ReservationStatus.COMPLETED),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateReservation', () => {
    it('成功修改预订时段和桌型', async () => {
      const requestedReservation = { ...mockReservation, status: ReservationStatus.REQUESTED };
      reservationRepository.findById.mockResolvedValue(requestedReservation);
      storeRepository.findById.mockResolvedValue(mockStore);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 8, 1, '']);
      reservationRepository.update.mockResolvedValue(requestedReservation);
      redisService.decrementReservationCount.mockResolvedValue(1);

      const result = await service.updateReservation(mockReservation.id, {
        timeSlot: 'slot-dinner',
        timeSlotName: '晚餐',
        tableConfigId: 'table-4',
        tableConfigName: '4人桌',
      });

      expect(reservationRepository.update).toHaveBeenCalled();
      expect(redisService.checkAndIncrementReservationCount).toHaveBeenCalled();
      expect(redisService.decrementReservationCount).toHaveBeenCalled();
    });

    it('预订不存在时抛出异常', async () => {
      reservationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateReservation('nonexistent-id', {}),
      ).rejects.toThrow(new NotFoundException('预订不存在'));
    });

    it('已完成状态不允许修改', async () => {
      const completedReservation = { ...mockReservation, status: ReservationStatus.COMPLETED };
      reservationRepository.findById.mockResolvedValue(completedReservation);

      await expect(
        service.updateReservation(mockReservation.id, {}),
      ).rejects.toThrow(new BadRequestException('当前状态不允许修改'));
    });

    it('新桌型已订完时抛出异常', async () => {
      const requestedReservation = { ...mockReservation, status: ReservationStatus.REQUESTED };
      reservationRepository.findById.mockResolvedValue(requestedReservation);
      storeRepository.findById.mockResolvedValue(mockStore);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([false, 8, 8, '已订完']);

      await expect(
        service.updateReservation(mockReservation.id, {
          timeSlot: 'slot-dinner',
          timeSlotName: '晚餐',
          tableConfigId: 'table-4',
          tableConfigName: '4人桌',
        }),
      ).rejects.toThrow(new BadRequestException('该桌型已订完'));
    });

    it('成功修改门店信息', async () => {
      const requestedReservation = { ...mockReservation, status: ReservationStatus.REQUESTED };
      reservationRepository.findById.mockResolvedValue(requestedReservation);

      const newStoreId = 'new-store-456';
      const newStore = { ...mockStore, _id: newStoreId, name: '新餐厅' };
      storeRepository.findById.mockResolvedValue(newStore);
      reservationRepository.update.mockResolvedValue({
        ...requestedReservation,
        storeId: newStoreId,
        storeName: '新餐厅',
      });

      await service.updateReservation(mockReservation.id, {
        storeId: newStoreId,
        storeName: '新餐厅',
      });

      expect(reservationRepository.update).toHaveBeenCalledWith(
        mockReservation.id,
        expect.objectContaining({
          storeId: newStoreId,
          storeName: '新餐厅',
        }),
      );
    });

    it('同时修改门店和时段', async () => {
      const requestedReservation = { ...mockReservation, status: ReservationStatus.REQUESTED };
      reservationRepository.findById.mockResolvedValue(requestedReservation);

      const newStoreId = 'new-store-456';
      const newStore = { ...mockStore, _id: newStoreId, name: '新餐厅' };
      storeRepository.findById.mockResolvedValue(newStore);
      redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 8, 1, '']);
      reservationRepository.update.mockResolvedValue(requestedReservation);
      redisService.decrementReservationCount.mockResolvedValue(1);

      await service.updateReservation(mockReservation.id, {
        storeId: newStoreId,
        storeName: '新餐厅',
        timeSlot: 'slot-dinner',
        timeSlotName: '晚餐',
      });

      expect(reservationRepository.update).toHaveBeenCalledWith(
        mockReservation.id,
        expect.objectContaining({
          storeId: newStoreId,
          storeName: '新餐厅',
          timeSlot: 'slot-dinner',
          timeSlotName: '晚餐',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('成功查询预订列表', async () => {
      const mockReservations = [mockReservation];
      reservationRepository.findAll.mockResolvedValue({
        data: mockReservations,
        total: 1,
        page: 1,
        pageSize: 10,
      });

      const query = { status: ReservationStatus.REQUESTED };
      const pagination = { page: 1, pageSize: 10 };
      const result = await service.findAll(query, pagination);

      expect(result).toEqual({
        data: mockReservations,
        total: 1,
        page: 1,
        pageSize: 10,
      });
      expect(reservationRepository.findAll).toHaveBeenCalledWith(query, pagination);
    });
  });

  describe('私有方法测试', () => {
    describe('validateDateRange', () => {
      it('日期在有效范围内', async () => {
        // 使用明天的日期
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: tomorrow.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'slot-lunch',
          tableConfigId: 'table-2',
        };

        storeRepository.findById.mockResolvedValue(mockStore);
        // SMS verification is no longer handled in the service layer
        reservationRepository.findDuplicateReservation.mockResolvedValue([]);
        redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 10, 1, '']);
        reservationRepository.create.mockResolvedValue(mockReservation);

        await expect(service.createReservation(input)).resolves.toBeDefined();
      });

      it('日期早于最小天数时抛出异常', async () => {
        storeRepository.findById.mockResolvedValue({
          ...mockStore,
          bookingRules: { minDaysAdvance: 7, maxDaysAdvance: 30 },
        });

        // 今天的日期应该因为需要提前7天而失败
        const today = new Date();
        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: today.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'slot-lunch',
          tableConfigId: 'table-2',
        };

        await expect(service.createReservation(input)).rejects.toThrow(
          new BadRequestException('预订日期必须至少提前 7 天'),
        );
      });
    });

    describe('validateTimeSlot', () => {
      it('无效时段时抛出异常', async () => {
        storeRepository.findById.mockResolvedValue(mockStore);

        // 使用未来日期避免日期验证失败
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: futureDate.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'invalid-slot',
          tableConfigId: 'table-2',
        };

        await expect(service.createReservation(input)).rejects.toThrow(
          new BadRequestException('无效的时段'),
        );
      });

      it('时段未启用时抛出异常', async () => {
        const disabledSlotStore = {
          ...mockStore,
          timeSlotConfig: [
            { id: 'slot-lunch', name: '午餐', startTime: '11:00', endTime: '14:00', enabled: false },
          ],
        };
        storeRepository.findById.mockResolvedValue(disabledSlotStore);

        // 使用未来日期避免日期验证失败
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: futureDate.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'slot-lunch',
          tableConfigId: 'table-2',
        };

        await expect(service.createReservation(input)).rejects.toThrow(
          new BadRequestException('该时段暂不接受预订'),
        );
      });
    });

    describe('validateEstimatedArrivalTime', () => {
      it('预计到达时间为空时不抛出异常（可选字段）', async () => {
        storeRepository.findById.mockResolvedValue(mockStore);
        // SMS verification is no longer handled in the service layer
        reservationRepository.findDuplicateReservation.mockResolvedValue([]);
        redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 10, 1, '']);
        reservationRepository.create.mockResolvedValue(mockReservation);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: futureDate.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'slot-lunch',
          tableConfigId: 'table-2',
          estimatedArrivalTime: undefined,
        };

        await expect(service.createReservation(input)).resolves.toBeDefined();
      });

      it('预计到达时间在时段范围内时通过校验', async () => {
        storeRepository.findById.mockResolvedValue(mockStore);
        // SMS verification is no longer handled in the service layer
        reservationRepository.findDuplicateReservation.mockResolvedValue([]);
        redisService.checkAndIncrementReservationCount.mockResolvedValue([true, 10, 1, '']);
        reservationRepository.create.mockResolvedValue(mockReservation);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: futureDate.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'slot-lunch',
          tableConfigId: 'table-2',
          estimatedArrivalTime: '12:30', // 午餐时段 11:00-14:00 之间
        };

        await expect(service.createReservation(input)).resolves.toBeDefined();
      });

      it('预计到达时间早于时段开始时间时抛出异常', async () => {
        storeRepository.findById.mockResolvedValue(mockStore);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: futureDate.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'slot-lunch',
          tableConfigId: 'table-2',
          estimatedArrivalTime: '10:30', // 早于午餐时段 11:00-14:00
        };

        await expect(service.createReservation(input)).rejects.toThrow(
          new BadRequestException('预计到达时间必须在 11:00-14:00 之间'),
        );
      });

      it('预计到达时间晚于时段结束时间时抛出异常', async () => {
        storeRepository.findById.mockResolvedValue(mockStore);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: futureDate.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'slot-lunch',
          tableConfigId: 'table-2',
          estimatedArrivalTime: '15:00', // 晚于午餐时段 11:00-14:00
        };

        await expect(service.createReservation(input)).rejects.toThrow(
          new BadRequestException('预计到达时间必须在 11:00-14:00 之间'),
        );
      });

      it('预计到达时间格式不正确时抛出异常', async () => {
        storeRepository.findById.mockResolvedValue(mockStore);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const input: CreateReservationInput = {
          customerName: '张三',
          customerPhone: '13800138000',
          verificationCode: '123456',
          reservationDate: futureDate.toISOString().split('T')[0],
          storeId: '507f1f77bcf86cd799439011',
          timeSlot: 'slot-lunch',
          tableConfigId: 'table-2',
          estimatedArrivalTime: '25:00', // 无效时间格式
        };

        await expect(service.createReservation(input)).rejects.toThrow(
          new BadRequestException('预计到达时间格式不正确，应为 HH:mm'),
        );
      });

      it('修改预订时预计到达时间超出范围时抛出异常', async () => {
        const requestedReservation = { ...mockReservation, status: ReservationStatus.REQUESTED };
        reservationRepository.findById.mockResolvedValue(requestedReservation);
        storeRepository.findById.mockResolvedValue(mockStore);

        await expect(
          service.updateReservation(mockReservation.id, {
            estimatedArrivalTime: '22:00', // 晚于午餐时段 11:00-14:00
          }),
        ).rejects.toThrow(new BadRequestException('预计到达时间必须在 11:00-14:00 之间'));
      });

      it('修改预订时预计到达时间在时段范围内时通过校验', async () => {
        const requestedReservation = { ...mockReservation, status: ReservationStatus.REQUESTED };
        reservationRepository.findById.mockResolvedValue(requestedReservation);
        storeRepository.findById.mockResolvedValue(mockStore);
        reservationRepository.update.mockResolvedValue(requestedReservation);

        const result = await service.updateReservation(mockReservation.id, {
          estimatedArrivalTime: '12:30', // 午餐时段 11:00-14:00 之间
        });

        expect(reservationRepository.update).toHaveBeenCalled();
      });

      it('修改预订时清空预计到达时间应通过校验', async () => {
        const requestedReservation = {
          ...mockReservation,
          status: ReservationStatus.REQUESTED,
          estimatedArrivalTime: '12:00',
        };
        reservationRepository.findById.mockResolvedValue(requestedReservation);
        storeRepository.findById.mockResolvedValue(mockStore);
        reservationRepository.update.mockResolvedValue(requestedReservation);

        const result = await service.updateReservation(mockReservation.id, {
          estimatedArrivalTime: '',
        });

        expect(reservationRepository.update).toHaveBeenCalled();
      });
    });
  });
});
