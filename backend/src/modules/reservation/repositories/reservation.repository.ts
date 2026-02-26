import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@common/database/database.service';
import { IReservation, ReservationModel, ReservationStatus } from '../models/reservation.model';
import { PaginationInput } from '@common/dto/pagination.dto';
import { SearchConsistency } from 'ottoman';

/**
 * 预订查询条件接口
 */
export interface ReservationQuery {
  status?: ReservationStatus | ReservationStatus[];
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  phone?: string;
  name?: string;
  timeSlot?: string;
  tableSize?: number;
  source?: string;
  storeId?: string;
}

/**
 * 预订分页结果接口
 */
export interface ReservationPaginationResult {
  data: IReservation[];
  pageInfo: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * 预订仓储
 *
 * 提供预订数据的访问层抽象
 */
@Injectable()
export class ReservationRepository {
  private readonly logger = new Logger(ReservationRepository.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 创建预订
   */
  async create(reservationData: Partial<IReservation>): Promise<IReservation> {
    return await ReservationModel.create(reservationData);
  }

  /**
   * 根据 ID 查找预订
   */
  async findById(id: string): Promise<IReservation | null> {
    try {
      return await ReservationModel.findById(id);
    } catch (error) {
      this.logger.warn(`findById failed for id: ${id}`, error);
      return null;
    }
  }

  /**
   * 根据 ID 更新预订
   */
  async update(
    id: string,
    updates: Partial<IReservation>,
  ): Promise<IReservation | null> {
    try {
      const reservation = await ReservationModel.findById(id);
      if (!reservation) {
        return null;
      }
      Object.assign(reservation, updates);
      return await reservation.save();
    } catch (error) {
      this.logger.error(`update failed for id: ${id}`, error);
      return null;
    }
  }

  /**
   * 查询预订列表（带分页）
   */
  async findAll(
    query: ReservationQuery,
    pagination: PaginationInput,
  ): Promise<ReservationPaginationResult> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const filter = this.buildFilter(query);
    const sort: Record<string, 'ASC' | 'DESC'> = {
      reservationDate: 'DESC',
      timeSlot: 'ASC',
    };

    const [data, total] = await Promise.all([
      ReservationModel.find(filter, {
        skip,
        limit,
        sort,
        consistency: SearchConsistency.LOCAL,
      }),
      this.countByFilter(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.rows,
      pageInfo: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * 检查是否有重复预订
   */
  async findDuplicateReservation(
    phone: string,
    date: Date,
  ): Promise<IReservation[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await ReservationModel.find({
      'customer.phone': phone,
      reservationDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: [ReservationStatus.REQUESTED, ReservationStatus.APPROVED] },
    }, { consistency: SearchConsistency.LOCAL });

    return result.rows;
  }

  /**
   * 构建查询条件
   */
  private buildFilter(query: ReservationQuery): any {
    const filter: any = {};

    if (query.status) {
      filter.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
    }

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.dateFrom || query.dateTo) {
      filter.reservationDate = {};
      if (query.dateFrom) {
        filter.reservationDate.$gte = query.dateFrom;
      }
      if (query.dateTo) {
        filter.reservationDate.$lte = query.dateTo;
      }
    }

    if (query.phone) {
      filter['customer.phone'] = query.phone;
    }

    if (query.name) {
      filter['customer.name'] = { $like: `%${query.name}%` };
    }

    if (query.timeSlot) {
      filter.timeSlot = query.timeSlot;
    }

    if (query.tableSize) {
      filter.tableSize = query.tableSize;
    }

    if (query.source) {
      filter.source = query.source;
    }

    if (query.storeId) {
      filter.storeId = query.storeId;
    }

    return filter;
  }

  /**
   * 根据条件计数
   */
  private async countByFilter(filter: any): Promise<number> {
    const result = await ReservationModel.find(filter, {
      limit: 1,
      consistency: SearchConsistency.LOCAL,
    });
    return result.rows.length;
  }
}
