import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@common/database/database.service';
import { IStore, StoreModel } from '../models/store.model';
import { SearchConsistency } from 'ottoman';

/**
 * 门店仓储
 *
 * 提供门店数据的访问层抽象
 */
@Injectable()
export class StoreRepository {
  private readonly logger = new Logger(StoreRepository.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 获取所有门店
   * 使用 LOCAL 一致性级别确保查询能看到当前实例的最新操作
   */
  async findAll(): Promise<IStore[]> {
    const result = await StoreModel.find({}, { consistency: SearchConsistency.LOCAL });
    return result.rows;
  }

  /**
   * 根据 ID 查找门店
   */
  async findById(id: string): Promise<IStore | null> {
    try {
      return await StoreModel.findById(id);
    } catch (error) {
      this.logger.warn(`findById failed for id: ${id}`, error);
      return null;
    }
  }

  /**
   * 更新门店配置
   */
  async updateConfig(
    id: string,
    updates: Partial<IStore>,
    updatedBy?: string,
  ): Promise<IStore | null> {
    try {
      const store = await StoreModel.findById(id);
      if (!store) {
        return null;
      }
      Object.assign(store, updates);
      store.lastConfigUpdatedAt = new Date();
      if (updatedBy) {
        store.lastConfigUpdatedBy = updatedBy;
      }
      return await store.save();
    } catch (error) {
      this.logger.error(`updateConfig failed for id: ${id}`, error);
      return null;
    }
  }

  /**
   * 创建门店
   */
  async create(storeData: Partial<IStore>): Promise<IStore> {
    return await StoreModel.create(storeData);
  }

}
