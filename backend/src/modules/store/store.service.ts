import { ConflictException, Injectable, Logger, NotFoundException, } from '@nestjs/common';
import { StoreRepository } from './repositories/store.repository';
import { CreateStoreInput, TimeSlotConfigInput, UpdateStoreConfigInput, } from '@/common/dto/update-store-config.dto';

/**
 * 门店服务
 *
 * 处理门店配置的读取、更新和验证
 */
@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(private readonly storeRepository: StoreRepository) {}

  /**
   * 根据 ID 获取门店
   */
  async findById(storeId: string) {
    return this.storeRepository.findById(storeId);
  }

  /**
   * 获取所有门店
   */
  async getAllStores() {
    return this.storeRepository.findAll();
  }

  /**
   * 创建门店
   */
  async createStore(input: CreateStoreInput, createdBy?: string) {
    // 验证配置
    this.validateConfig(input as any);

    // 创建门店
    const defaultBookingRules = {
      minDaysAdvance: 0,
      maxDaysAdvance: 30,
    };

    const bookingRules = input.bookingRules
      ? { ...defaultBookingRules, ...input.bookingRules }
      : defaultBookingRules;

    const storeData: any = {
      name: input.name,
      address: input.address,
      phone: input.phone,
      description: input.description,
      tableConfig: input.tableConfig || [],
      timeSlotConfig: input.timeSlotConfig || [],
      bookingRules,
    };

    const store = await this.storeRepository.create(storeData);

    this.logger.log(`Store ${store.name} created by ${createdBy || 'system'}`);

    return store;
  }

  /**
   * 更新门店配置
   */
  async updateConfig(
    storeId: string,
    updates: UpdateStoreConfigInput,
    updatedBy?: string,
  ) {
    // 获取当前配置
    const current = await this.storeRepository.findById(storeId);
    if (!current) {
      throw new NotFoundException('门店不存在');
    }

    // 验证配置
    this.validateConfig(updates);

    // 更新配置
    const updated = await this.storeRepository.updateConfig(
      storeId,
      updates as any,
      updatedBy,
    );

    if (!updated) {
      throw new NotFoundException('门店不存在');
    }

    this.logger.log(
      `Store ${storeId} config updated by ${updatedBy || 'system'}`,
    );

    return updated;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: UpdateStoreConfigInput): void {
    // 验证桌型配置
    if (config.tableConfig) {
      const seatCounts = new Set<number>();

      for (const table of config.tableConfig) {
        // 检查桌数必须为正数
        if (table.count <= 0) {
          throw new ConflictException(`桌型 ${table.name} 的数量必须大于 0`);
        }

        // 检查座位数必须为正数
        if (table.seats <= 0) {
          throw new ConflictException(`桌型 ${table.name} 的座位数必须大于 0`);
        }

        // 检查座位数是否重复
        if (seatCounts.has(table.seats)) {
          throw new ConflictException(`座位数 ${table.seats} 重复定义`);
        }
        seatCounts.add(table.seats);
      }
    }

    // 验证时段配置
    if (config.timeSlotConfig) {
      for (const slot of config.timeSlotConfig) {
        // 验证时间格式 HH:MM
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(slot.startTime)) {
          throw new ConflictException(`时段 ${slot.name} 的开始时间格式无效`);
        }
        if (!timeRegex.test(slot.endTime)) {
          throw new ConflictException(`时段 ${slot.name} 的结束时间格式无效`);
        }

        // 验证结束时间必须晚于开始时间
        if (slot.startTime >= slot.endTime) {
          throw new ConflictException(
            `时段 ${slot.name} 的结束时间必须晚于开始时间`,
          );
        }
      }

      // 检查时段是否重叠
      this.checkTimeSlotOverlap(config.timeSlotConfig);
    }

    // 验证预订规则
    if (config.bookingRules) {
      const { minDaysAdvance, maxDaysAdvance } = config.bookingRules;

      if (minDaysAdvance !== undefined && minDaysAdvance < 0) {
        throw new ConflictException('最少提前预订天数不能为负数');
      }

      if (maxDaysAdvance !== undefined && maxDaysAdvance <= 0) {
        throw new ConflictException('最多提前预订天数必须大于 0');
      }

      if (
        minDaysAdvance !== undefined &&
        maxDaysAdvance !== undefined &&
        minDaysAdvance > maxDaysAdvance
      ) {
        throw new ConflictException('最少提前预订天数不能大于最多提前预订天数');
      }
    }
  }

  /**
   * 检查时段重叠
   */
  private checkTimeSlotOverlap(slots: TimeSlotConfigInput[]): void {
    const enabledSlots = slots.filter((s) => s.enabled);

    for (let i = 0; i < enabledSlots.length; i++) {
      for (let j = i + 1; j < enabledSlots.length; j++) {
        const slotA = enabledSlots[i];
        const slotB = enabledSlots[j];

        // 检查时段重叠
        if (
          this.isTimeOverlap(
            slotA.startTime,
            slotA.endTime,
            slotB.startTime,
            slotB.endTime,
          )
        ) {
          throw new ConflictException(
            `时段 ${slotA.name} 与 ${slotB.name} 存在时间重叠`,
          );
        }
      }
    }
  }

  /**
   * 判断两个时段是否重叠
   */
  private isTimeOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    return startA < endB && endA > startB;
  }
}
