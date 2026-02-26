import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { ReservationService } from '../reservation.service';
import { StoreRepository } from '../../store/repositories/store.repository';
import {
  CreateReservationInput,
  ReservationListType,
  ReservationQueryInput,
  ReservationType,
  UpdateReservationInput,
  UpdateReservationStatusInput,
} from '@/common/dto/reservation.dto';
import { PaginationInput } from '@common/dto/pagination.dto';
import { ReservationQuery } from '../repositories/reservation.repository';

/**
 * 预订 GraphQL Resolver
 */
@Resolver(() => ReservationType)
export class ReservationResolver {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly storeRepository: StoreRepository,
  ) {
  }

  /**
   * 查询预订列表
   */
  @Query(() => ReservationListType)
  @UseGuards(JwtAuthGuard)
  async reservations(
    @Args('query', { nullable: true }) query?: ReservationQueryInput,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<ReservationListType> {
    const reservationQuery: ReservationQuery = this.convertQueryInput(query || {});
    const paginationInput: PaginationInput = {
      page: pagination?.page || 1,
      limit: pagination?.limit || 20,
    };
    const result = await this.reservationService.findAll(reservationQuery, paginationInput);

    // 并行格式化所有预订
    const formattedData = await Promise.all(
      result.data.map(r => this.formatReservation(r))
    );

    return {
      data: formattedData,
      pageInfo: {
        total: result.pageInfo.total,
        page: result.pageInfo.page,
        limit: result.pageInfo.limit,
        totalPages: result.pageInfo.totalPages,
        hasNextPage: result.pageInfo.hasNextPage,
        hasPreviousPage: result.pageInfo.hasPreviousPage,
      },
    };
  }

  /**
   * 创建预订
   */
  @Mutation(() => ReservationType)
  @UseGuards(JwtAuthGuard)
  async createReservation(
    @Args('input') input: CreateReservationInput,
    @Context() context: any,
  ): Promise<ReservationType> {
    const userId = context.req?.user?.id;
    const result = await this.reservationService.createReservation(input, userId);
    return this.formatReservation(result);
  }

  /**
   * 更新预订信息
   */
  @Mutation(() => ReservationType)
  @UseGuards(JwtAuthGuard)
  async updateReservation(
    @Args('input') input: UpdateReservationInput,
  ): Promise<ReservationType> {
    const result = await this.reservationService.updateReservation(
      input.reservationId,
      {
        reservationDate: input.reservationDate,
        storeId: input.storeId,
        storeName: input.storeName,
        timeSlot: input.timeSlot,
        timeSlotName: input.timeSlotName,
        tableConfigId: input.tableConfigId,
        tableConfigName: input.tableConfigName,
        specialRequests: input.specialRequests,
        estimatedArrivalTime: input.estimatedArrivalTime,
      },
    );
    return this.formatReservation(result);
  }

  /**
   * 更新预订状态（统一入口）
   * 支持的操作：确认、取消、完成
   */
  @Mutation(() => ReservationType)
  @UseGuards(JwtAuthGuard)
  async updateReservationStatus(
    @Args('input') input: UpdateReservationStatusInput,
    @Context() context: any,
  ): Promise<ReservationType> {
    const userId = context.req?.user?.id;
    const result = await this.reservationService.updateStatus(
      input.reservationId,
      input.status,
      input.reason,
      userId,
    );
    return this.formatReservation(result);
  }

  /**
   * 转换 GraphQL Query 输入到 Repository Query
   */
  private convertQueryInput(input: ReservationQueryInput): ReservationQuery {
    const query: ReservationQuery = {};
    if (input.status) query.status = input.status;
    if (input.userId) query.userId = input.userId;
    if (input.dateFrom) query.dateFrom = new Date(input.dateFrom);
    if (input.dateTo) query.dateTo = new Date(input.dateTo);
    if (input.phone) query.phone = input.phone;
    if (input.name) query.name = input.name;
    if (input.timeSlot) query.timeSlot = input.timeSlot;
    if (input.tableSize) query.tableSize = input.tableSize;
    if (input.source) query.source = input.source;
    if (input.storeId) query.storeId = input.storeId;
    return query;
  }

  /**
   * 格式化预订数据
   */
  private async formatReservation(doc: any): Promise<ReservationType> {
    if (!doc) return null as any;
    // Ottoman 模型直接返回对象，不需要 toObject()
    const obj = doc;

    // 获取门店名称和桌型名称
    let storeName: string | undefined;
    let tableConfigName: string | undefined;

    if (obj.storeId) {
      const store = await this.storeRepository.findById(obj.storeId);
      if (store) {
        storeName = store.name;
        if (obj.tableConfigId) {
          const tableConfig = store.tableConfig?.find(t => t?.id === obj.tableConfigId);
          tableConfigName = tableConfig?.name;
        }
      }
    }

    return {
      id: obj.id || obj._id || '',
      userId: obj.userId,
      customer: {
        name: obj.customer?.name || '',
        phone: obj.customer?.phone || '',
        email: obj.customer?.email || '',
      },
      reservationDate: this.formatDate(obj.reservationDate),
      timeSlot: obj.timeSlot || '',
      timeSlotName: obj.timeSlotName || '',
      tableSize: obj.tableSize || 0,
      tableConfigId: obj.tableConfigId,
      tableConfigName: tableConfigName,
      status: obj.status || '',
      estimatedArrivalTime: obj.estimatedArrivalTime,
      specialRequests: obj.specialRequests,
      storeId: obj.storeId,
      storeName: storeName,
      confirmedAt: obj.confirmedAt,
      confirmedBy: obj.confirmedBy,
      completedAt: obj.completedAt,
      cancelledAt: obj.cancelledAt,
      cancelReason: obj.cancelReason,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    } as ReservationType;
  }

  /**
   * 格式化日期为 YYYY-MM-DD 格式
   */
  private formatDate(date: any): string {
    if (!date) return '';
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(date);
  }
}
