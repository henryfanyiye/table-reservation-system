import { Test, TestingModule } from '@nestjs/testing';
import { ReservationRepository } from './reservation.repository';
import { IReservation, ReservationModel, ReservationStatus } from '../models/reservation.model';
import { DatabaseService } from '@common/database/database.service';
import { DocumentNotFoundError } from 'ottoman';
import { Logger } from '@nestjs/common';

describe('ReservationRepository', () => {
  let repository: ReservationRepository;
  let logger: jest.Mocked<Logger>;

  const mockReservation: IReservation = {
    id: '507f1f77bcf86cd799439011',
    customer: {
      name: '张三',
      phone: '13800138000',
      email: 'test@example.com',
    },
    reservationDate: new Date('2024-06-15T00:00:00.000Z'),
    storeId: 'store123',
    storeName: '希尔顿餐厅',
    timeSlot: '18:00-20:00',
    timeSlotName: '晚餐时段',
    tableConfigId: 'tableConfig1',
    tableConfigName: '2人桌',
    status: ReservationStatus.REQUESTED,
    specialRequests: '靠窗位置',
    estimatedArrivalTime: '18:00',
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      getCluster: jest.fn(),
      getBucket: jest.fn(),
      getScope: jest.fn(),
    } as unknown as jest.Mocked<DatabaseService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    repository = module.get<ReservationRepository>(ReservationRepository);

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

  describe('create', () => {
    it('成功创建预订', async () => {
      const newReservation = { ...mockReservation };
      jest.spyOn(ReservationModel, 'create').mockResolvedValue(newReservation as any);

      const result = await repository.create({
        customer: {
          name: '张三',
          phone: '13800138000',
        },
        reservationDate: new Date('2024-06-15'),
        timeSlot: '18:00-20:00',
        status: ReservationStatus.REQUESTED,
      });

      expect(result).toBeDefined();
      expect(result.customer.name).toBe('张三');
    });
  });

  describe('findById', () => {
    it('成功根据 ID 查找预订', async () => {
      jest.spyOn(ReservationModel, 'findById').mockResolvedValue(mockReservation as any);

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockReservation);
    });

    it('ID 不存在时返回 null 并记录警告日志', async () => {
      const error = new DocumentNotFoundError('Document not found');
      jest.spyOn(ReservationModel, 'findById').mockRejectedValue(error);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'findById failed for id: nonexistent-id',
        error
      );
    });
  });

  describe('update', () => {
    it('成功更新预订', async () => {
      const updatedReservation = {
        ...mockReservation,
        status: ReservationStatus.APPROVED,
        confirmedAt: new Date(),
        confirmedBy: 'admin123',
      };

      const mockInstance = {
        ...mockReservation,
        save: jest.fn().mockResolvedValue(updatedReservation),
      };
      jest.spyOn(ReservationModel, 'findById').mockResolvedValue(mockInstance as any);

      const result = await repository.update('507f1f77bcf86cd799439011', {
        status: ReservationStatus.APPROVED,
        confirmedAt: new Date(),
        confirmedBy: 'admin123',
      });

      expect(result).toBeDefined();
      expect(result?.status).toBe(ReservationStatus.APPROVED);
    });

    it('更新不存在的预订返回 null 并记录错误日志', async () => {
      const error = new DocumentNotFoundError('Document not found');
      jest.spyOn(ReservationModel, 'findById').mockRejectedValue(error);

      const result = await repository.update('nonexistent-id', {
        status: ReservationStatus.APPROVED,
      });

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'update failed for id: nonexistent-id',
        error
      );
    });
  });

  describe('findAll', () => {
    it('成功查询预订列表', async () => {
      const mockData = {
        rows: [mockReservation],
        meta: { total: 1 },
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      const result = await repository.findAll(
        { status: ReservationStatus.REQUESTED },
        { page: 1, limit: 20 },
      );

      expect(result.data).toEqual([mockReservation]);
      expect(result.pageInfo.total).toBe(1);
    });

    it('空列表时返回正确的分页信息', async () => {
      const mockData = {
        rows: [],
        meta: { total: 0 },
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      const result = await repository.findAll({}, { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.pageInfo.total).toBe(0);
    });

    it('支持按手机号查询', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll({ phone: '13800138000' }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'customer.phone': '13800138000',
        }),
        expect.any(Object),
      );
    });

    it('支持按姓名模糊查询', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll({ name: '张三' }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'customer.name': { $like: '%张三%' },
        }),
        expect.any(Object),
      );
    });

    it('支持按时段查询', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll({ timeSlot: '18:00-20:00' }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSlot: '18:00-20:00',
        }),
        expect.any(Object),
      );
    });

    it('支持按桌型大小查询', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll({ tableSize: 4 }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tableSize: 4,
        }),
        expect.any(Object),
      );
    });

    it('支持按来源查询', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll({ source: 'web' }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'web',
        }),
        expect.any(Object),
      );
    });

    it('支持按门店查询', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll({ storeId: 'store123' }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'store123',
        }),
        expect.any(Object),
      );
    });

    it('支持日期范围查询（仅开始日期）', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      const dateFrom = new Date('2024-06-01');
      await repository.findAll({ dateFrom }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationDate: { $gte: dateFrom },
        }),
        expect.any(Object),
      );
    });

    it('支持日期范围查询（仅结束日期）', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      const dateTo = new Date('2024-06-30');
      await repository.findAll({ dateTo }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationDate: { $lte: dateTo },
        }),
        expect.any(Object),
      );
    });

    it('支持日期范围查询（开始和结束日期）', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      const dateFrom = new Date('2024-06-01');
      const dateTo = new Date('2024-06-30');
      await repository.findAll({ dateFrom, dateTo }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationDate: { $gte: dateFrom, $lte: dateTo },
        }),
        expect.any(Object),
      );
    });

    it('支持多状态查询', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll(
        { status: [ReservationStatus.REQUESTED, ReservationStatus.APPROVED] },
        { page: 1, limit: 20 },
      );

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: [ReservationStatus.REQUESTED, ReservationStatus.APPROVED] },
        }),
        expect.any(Object),
      );
    });

    it('支持按 userId 查询', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll({ userId: 'user123' }, { page: 1, limit: 20 });

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
        }),
        expect.any(Object),
      );
    });

    it('支持组合查询（userId + status）', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      await repository.findAll(
        { userId: 'user123', status: ReservationStatus.REQUESTED },
        { page: 1, limit: 20 },
      );

      expect(ReservationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          status: ReservationStatus.REQUESTED,
        }),
        expect.any(Object),
      );
    });
  });

  describe('findDuplicateReservation', () => {
    it('成功找到重复预订', async () => {
      const mockData = {
        rows: [mockReservation],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      const result = await repository.findDuplicateReservation(
        '13800138000',
        new Date('2024-06-15T12:00:00.000Z'),
      );

      expect(result).toEqual([mockReservation]);
    });

    it('没有找到重复预订时返回空数组', async () => {
      const mockData = {
        rows: [],
      };
      jest.spyOn(ReservationModel, 'find').mockResolvedValue(mockData as any);

      const result = await repository.findDuplicateReservation(
        '13800138000',
        new Date('2024-06-15T12:00:00.000Z'),
      );

      expect(result).toEqual([]);
    });
  });

  describe('日志记录', () => {
    it('findById 失败时记录警告日志', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(ReservationModel, 'findById').mockRejectedValue(error);

      await repository.findById('nonexistent-id');

      expect(logger.warn).toHaveBeenCalledWith(
        'findById failed for id: nonexistent-id',
        error
      );
    });

    it('update 失败时记录错误日志', async () => {
      const error = new Error('Update failed');
      jest.spyOn(ReservationModel, 'findById').mockRejectedValue(error);

      await repository.update('some-id', { status: ReservationStatus.APPROVED });

      expect(logger.error).toHaveBeenCalledWith(
        'update failed for id: some-id',
        error
      );
    });
  });
});
