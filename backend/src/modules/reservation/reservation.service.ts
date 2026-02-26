import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IReservation, ReservationStatus } from './models/reservation.model';
import { ReservationQuery, ReservationRepository } from './repositories/reservation.repository';
import { StoreRepository } from '../store/repositories/store.repository';
import { SmsService } from '../sms/sms.service';
import { PaginationInput } from '@common/dto/pagination.dto';
import { maskPhone } from '@common/logger/logger.module';
import { CreateReservationInput } from '@common/dto/reservation.dto';
import { RedisService } from '@common/redis/redis.service';

/**
 * 预订服务
 *
 * 处理预订的核心业务逻辑
 */
@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly storeRepository: StoreRepository,
    private readonly smsService: SmsService,
    private readonly redisService: RedisService,
  ) {
  }

  /**
   * 创建预订
   */
  async createReservation(
    input: CreateReservationInput,
    userId?: string,
  ): Promise<IReservation> {
    // 1. 验证输入
    await this.validateReservationInput(input);

    // 2. 检查重复预订
    const existing = await this.reservationRepository.findDuplicateReservation(
      input.customerPhone,
      new Date(input.reservationDate),
    );
    if (existing.length > 0) {
      throw new ConflictException('您已有预订');
    }

    // 4. 获取门店配置
    const storeId = input.storeId;
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('门店配置不存在');
    }

    // 5. 根据 tableConfigId 获取桌型配置
    const tableConfig = store.tableConfig?.find(
      (t) => t?.id === input.tableConfigId,
    );
    if (!tableConfig) {
      throw new BadRequestException('无效的桌型配置');
    }

    // 6. 检查桌型可用数量
    const reservationDate = new Date(input.reservationDate);
    const dateStr = this.formatDate(reservationDate);

    // 计算 TTL: 预约日期 + 1天后的秒数
    const ttl = this.calculateTTL(reservationDate);

    const [success] =
      await this.redisService.checkAndIncrementReservationCount(
        input.tableConfigId,
        input.timeSlot,
        dateStr,
        tableConfig.count,
        ttl,
      );

    if (!success) {
      throw new BadRequestException('该桌型已订完');
    }

    try {
      // 创建预订记录
      const reservationData: Partial<IReservation> = {
        customer: {
          name: input.customerName,
          phone: input.customerPhone,
          email: input.customerEmail,
        },
        reservationDate: new Date(input.reservationDate),
        storeId: input.storeId,
        storeName: input.storeName,
        timeSlot: input.timeSlot,
        timeSlotName: input.timeSlotName,
        tableConfigId: input.tableConfigId,
        tableConfigName: input.tableConfigName,
        status: ReservationStatus.REQUESTED,
      };

      // 保存 userId（如果有）
      if (userId) {
        reservationData.userId = userId;
      }

      // 只在有值时设置可选字段
      if (input.specialRequests) {
        reservationData.specialRequests = input.specialRequests;
      }
      if (input.estimatedArrivalTime) {
        reservationData.estimatedArrivalTime = input.estimatedArrivalTime;
      }

      const reservation = await this.reservationRepository.create(reservationData);

      this.logger.log(
        `Reservation created: ${reservation.id} for ${maskPhone(input.customerPhone)}`,
      );

      return reservation;
    } catch (error) {
      // Couchbase 创建失败，回滚 Redis 计数
      try {
        await this.redisService.decrementReservationCount(
          input.tableConfigId,
          input.timeSlot,
          dateStr,
        );
        this.logger.warn(
          `Redis count rolled back for ${input.tableConfigId}:${input.timeSlot}:${dateStr}`,
        );
      } catch (rollbackError) {
        this.logger.error('Failed to rollback Redis count', rollbackError);
      }
      throw error;
    }
  }

  /**
   * 更新预订信息
   */
  async updateReservation(
    id: string,
    updates: {
      reservationDate?: string;
      storeId?: string;
      storeName?: string;
      timeSlot?: string;
      timeSlotName?: string;
      tableConfigId?: string;
      tableConfigName?: string;
      specialRequests?: string;
      estimatedArrivalTime?: string;
    },
  ): Promise<IReservation> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundException('预订不存在');
    }

    // 只有待确认和已确认状态可以修改
    if (
      reservation.status !== ReservationStatus.REQUESTED &&
      reservation.status !== ReservationStatus.APPROVED
    ) {
      throw new BadRequestException('当前状态不允许修改');
    }

    // 验证更新内容
    const storeId = updates.storeId || reservation.storeId;
    let store = null;
    if (storeId) {
      store = await this.storeRepository.findById(storeId);
    }
    if (!store) {
      throw new NotFoundException('门店配置不存在');
    }

    // 记录原值用于计数管理
    const oldDateStr = this.formatDate(reservation.reservationDate);
    const oldTimeSlot = reservation.timeSlot;
    const oldTableConfigId = reservation.tableConfigId;

    // 准备更新数据
    const updateData: Partial<IReservation> = {};
    let newDate = reservation.reservationDate;
    let newTimeSlot = reservation.timeSlot;
    let newTableConfigId = reservation.tableConfigId;
    let newTableConfig = store.tableConfig?.find(
      (t) => t?.id === oldTableConfigId,
    );

    // 处理门店变更
    if (updates.storeId && updates.storeId !== reservation.storeId) {
      updateData.storeId = updates.storeId;
      updateData.storeName = updates.storeName;
    }

    if (updates.reservationDate) {
      newDate = new Date(updates.reservationDate);
      this.validateDateRange(newDate, store.bookingRules);
      updateData.reservationDate = newDate;
    }

    if (updates.timeSlot && updates.timeSlotName) {
      this.validateTimeSlot(updates.timeSlot, store.timeSlotConfig);
      newTimeSlot = updates.timeSlot;
      updateData.timeSlot = updates.timeSlot;
      updateData.timeSlotName = updates.timeSlotName;
    }

    if (updates.tableConfigId) {
      const tableConfig = store.tableConfig?.find(
        (t) => t?.id === updates.tableConfigId,
      );
      if (!tableConfig) {
        throw new BadRequestException('无效的桌型配置');
      }
      newTableConfigId = updates.tableConfigId;
      newTableConfig = tableConfig;
      updateData.tableConfigId = updates.tableConfigId;
      updateData.tableConfigName = updates.tableConfigName;
    }

    if (updates.estimatedArrivalTime !== undefined) {
      // 验证预计到达时间是否在时段范围内
      this.validateEstimatedArrivalTime(
        updates.estimatedArrivalTime,
        newTimeSlot,
        store.timeSlotConfig,
      );
      updateData.estimatedArrivalTime = updates.estimatedArrivalTime;
    }

    if (updates.specialRequests !== undefined) {
      updateData.specialRequests = updates.specialRequests;
    }

    // 检查计数 key 是否变化（桌型、时段或日期）
    const newDateStr = this.formatDate(newDate);
    const countKeyChanged =
      oldDateStr !== newDateStr ||
      oldTimeSlot !== newTimeSlot ||
      oldTableConfigId !== newTableConfigId;

    // 如果计数 key 变化，需要检查新桌型并处理计数
    if (countKeyChanged) {
      // 检查新桌型是否可用
      if (!newTableConfigId) {
        throw new BadRequestException('桌型配置不能为空');
      }

      const ttl = this.calculateTTL(newDate);
      const [success] =
        await this.redisService.checkAndIncrementReservationCount(
          newTableConfigId,
          newTimeSlot,
          newDateStr,
          newTableConfig?.count || 0,
          ttl,
        );

      if (!success) {
        throw new BadRequestException('该桌型已订完');
      }

      try {
        // 更新预订记录
        const updated = await this.reservationRepository.update(id, updateData);

        // 数据库更新成功，释放原桌型计数
        if (oldTableConfigId) {
          try {
            await this.redisService.decrementReservationCount(
              oldTableConfigId,
              oldTimeSlot,
              oldDateStr,
            );
            this.logger.log(
              `Reservation ${id} updated: released ${oldTableConfigId}:${oldTimeSlot}:${oldDateStr}`,
            );
          } catch (decrementError) {
            this.logger.error(
              'Failed to release old table count',
              decrementError,
            );
          }
        }

        this.logger.log(`Reservation ${id} updated`);
        return updated!;
      } catch (error) {
        // 数据库更新失败，回滚新桌型计数
        try {
          await this.redisService.decrementReservationCount(
            newTableConfigId,
            newTimeSlot,
            newDateStr,
          );
          this.logger.warn(
            `Redis count rolled back for ${newTableConfigId}:${newTimeSlot}:${newDateStr}`,
          );
        } catch (rollbackError) {
          this.logger.error('Failed to rollback Redis count', rollbackError);
        }
        throw error;
      }
    }

    // 计数 key 没有变化，直接更新
    const updated = await this.reservationRepository.update(id, updateData);

    this.logger.log(`Reservation ${id} updated`);

    return updated!;
  }

  /**
   * 更新预订状态
   */
  async updateStatus(
    id: string,
    newStatus: ReservationStatus,
    reason?: string,
    updatedBy?: string,
  ): Promise<IReservation> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new NotFoundException('预订不存在');
    }

    // 验证状态转换
    const isValidTransition = this.isValidStatusTransition(
      reservation.status,
      newStatus,
    );
    if (!isValidTransition) {
      throw new BadRequestException(
        `不能从 ${reservation.status} 转换到 ${newStatus}`,
      );
    }

    const dateStr = this.formatDate(reservation.reservationDate);

    // 检查是否需要释放桌位（REQUESTED/APPROVED → CANCELLED）
    const shouldReleaseTable =
      (reservation.status === ReservationStatus.REQUESTED ||
        reservation.status === ReservationStatus.APPROVED) &&
      newStatus === ReservationStatus.CANCELLED;

    // 更新预订
    const updates: Partial<IReservation> = {
      status: newStatus,
    };

    if (newStatus === ReservationStatus.APPROVED) {
      updates.confirmedAt = new Date();
      updates.confirmedBy = updatedBy;
    } else if (newStatus === ReservationStatus.CANCELLED) {
      updates.cancelledAt = new Date();
      updates.cancelledBy = updatedBy;
      updates.cancelReason = reason;
    } else if (newStatus === ReservationStatus.COMPLETED) {
      updates.completedAt = new Date();
    }

    const updated = await this.reservationRepository.update(id, updates);

    // 如果需要释放桌位，调用 Redis decrement
    if (shouldReleaseTable) {
      if (!reservation.tableConfigId) {
        this.logger.warn(`Reservation ${id} has no tableConfigId, skipping decrement`);
      } else {
        try {
          await this.redisService.decrementReservationCount(
            reservation.tableConfigId,
            reservation.timeSlot,
            dateStr,
          );
          this.logger.log(
            `Table count decremented for ${reservation.tableConfigId}:${reservation.timeSlot}:${dateStr}`,
          );
        } catch (error) {
          this.logger.error('Failed to decrement reservation count', error);
          // 注意：这里不抛出异常，因为状态已经更新成功
        }
      }
    }

    this.logger.log(
      `Reservation ${id} status changed: ${reservation.status} -> ${newStatus} by ${updatedBy || 'system'}`,
    );

    return updated!;
  }

  /**
   * 查询预订列表
   */
  async findAll(query: ReservationQuery, pagination: PaginationInput) {
    return this.reservationRepository.findAll(query, pagination);
  }

  /**
   * 验证预订输入
   */
  private async validateReservationInput(
    input: CreateReservationInput,
  ): Promise<void> {
    const storeId = input.storeId;
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('门店配置不存在');
    }

    // 1. 验证日期范围
    const reservationDate = new Date(input.reservationDate);
    this.validateDateRange(reservationDate, store.bookingRules);

    // 2. 验证时段
    this.validateTimeSlot(input.timeSlot, store.timeSlotConfig);

    // 3. 验证预计到达时间
    this.validateEstimatedArrivalTime(
      input.estimatedArrivalTime,
      input.timeSlot,
      store.timeSlotConfig,
    );

    // 4. 验证桌型配置
    const tableConfig = store.tableConfig?.find(
      (t) => t?.id === input.tableConfigId,
    );
    if (!tableConfig) {
      throw new BadRequestException('无效的桌型配置');
    }
  }

  /**
   * 验证日期范围
   */
  private validateDateRange(date: Date, bookingRules?: any): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const reservationDate = new Date(date);
    reservationDate.setHours(0, 0, 0, 0);

    const minDays = bookingRules?.minDaysAdvance || 0;
    const maxDays = bookingRules?.maxDaysAdvance || 30;

    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() + minDays);

    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + maxDays);

    if (reservationDate < minDate) {
      throw new BadRequestException(`预订日期必须至少提前 ${minDays} 天`);
    }

    if (reservationDate > maxDate) {
      throw new BadRequestException(`预订日期最多提前 ${maxDays} 天`);
    }
  }

  /**
   * 验证时段
   */
  private validateTimeSlot(timeSlot: string, timeSlotConfig: any[]): void {
    const slot = timeSlotConfig.find((s) => s.id === timeSlot);
    if (!slot) {
      throw new BadRequestException('无效的时段');
    }
    if (!slot.enabled) {
      throw new BadRequestException('该时段暂不接受预订');
    }
  }

  /**
   * 验证预计到达时间是否在时段范围内
   */
  private validateEstimatedArrivalTime(
    estimatedArrivalTime: string | undefined,
    timeSlot: string,
    timeSlotConfig: any[],
  ): void {
    if (!estimatedArrivalTime) {
      return; // 预计到达时间是可选的，为空则不校验
    }

    const slot = timeSlotConfig.find((s) => s.id === timeSlot);
    if (!slot) {
      throw new BadRequestException('无效的时段');
    }

    // 验证格式 HH:mm
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(estimatedArrivalTime)) {
      throw new BadRequestException('预计到达时间格式不正确，应为 HH:mm');
    }

    // 验证是否在时段范围内
    if (estimatedArrivalTime < slot.startTime || estimatedArrivalTime > slot.endTime) {
      throw new BadRequestException(
        `预计到达时间必须在 ${slot.startTime}-${slot.endTime} 之间`,
      );
    }
  }

  /**
   * 验证状态转换是否合法
   */
  private isValidStatusTransition(
    fromStatus: ReservationStatus,
    toStatus: ReservationStatus,
  ): boolean {
    const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
      [ReservationStatus.REQUESTED]: [
        ReservationStatus.APPROVED,
        ReservationStatus.CANCELLED,
      ],
      [ReservationStatus.APPROVED]: [
        ReservationStatus.COMPLETED,
        ReservationStatus.CANCELLED,
      ],
      [ReservationStatus.CANCELLED]: [],
      [ReservationStatus.COMPLETED]: [],
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 计算 Redis TTL（预约日期 + 1天后的秒数）
   * 确保 Redis Key 在预约日期过后 1 天过期
   */
  private calculateTTL(reservationDate: Date): number {
    const now = new Date();
    const expiryDate = new Date(reservationDate);

    // 设置过期时间为预约日期 + 1 天的 23:59:59
    expiryDate.setDate(expiryDate.getDate() + 1);
    expiryDate.setHours(23, 59, 59, 999);

    // 计算秒数差
    const ttl = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);

    // 如果计算出的 TTL 小于等于 0，至少保留 1 小时
    return ttl > 0 ? ttl : 3600;
  }
}
