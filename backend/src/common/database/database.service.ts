import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as couchbase from 'couchbase';
import { Cluster, connect } from 'couchbase';
import { Ottoman } from 'ottoman';

/**
 * 全局 Ottoman 实例
 * 用于在 model 定义时注册
 * 配置 maxExpiry 为 0，避免 Couchbase 社区版报错（maxTTL 仅企业版支持）
 */
export const ottomanInstance = new Ottoman({ maxExpiry: 0 });

/**
 * Couchbase 数据库服务
 *
 * 负责建立和管理与 Couchbase 集群的连接，以及初始化 Ottoman ODM
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private cluster: Cluster | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
    await this.initOttoman();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * 建立 Couchbase 连接
   */
  private async connect(): Promise<void> {
    try {
      const connectionString = this.configService.get<string>('COUCHBASE_CONNECTION_STRING', 'couchbase://localhost');
      const username = this.configService.get<string>('COUCHBASE_USERNAME', 'Administrator');
      const password = this.configService.get<string>('COUCHBASE_PASSWORD', 'password123');
      const bucketName = this.configService.get<string>('COUCHBASE_BUCKET', 'table_reservation');

      this.cluster = await connect(connectionString, {
        username,
        password,
      });

      this.logger.log(`Couchbase 连接成功: ${connectionString}, bucket: ${bucketName}`);
    } catch (error) {
      this.logger.error('Couchbase 连接失败', error);
      throw error;
    }
  }

  /**
   * 初始化 Ottoman ODM
   */
  private async initOttoman(): Promise<void> {
    try {
      const bucketName = this.configService.get<string>('COUCHBASE_BUCKET', 'table_reservation');

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 使用已建立的 cluster 连接初始化 Ottoman
      // 直接设置 cluster、bucket 和 couchbase 到 Ottoman 实例
      (ottomanInstance as any)._cluster = this.cluster!;
      (ottomanInstance as any).bucket = this.cluster!.bucket(bucketName);
      (ottomanInstance as any).bucketName = bucketName;
      (ottomanInstance as any).couchbase = couchbase;

      await ottomanInstance.ensureIndexes({ ignoreWatchIndexes: true });

      this.logger.log('Ottoman ODM 初始化成功');
    } catch (error) {
      this.logger.error('Ottoman 初始化失败', error);
      throw error;
    }
  }

  /**
   * 断开 Couchbase 连接
   */
  private async disconnect(): Promise<void> {
    try {
      await ottomanInstance.close();
      this.logger.log('Ottoman 连接已关闭');
    } catch (error) {
      this.logger.error('关闭 Ottoman 连接时出错', error);
    }

    if (this.cluster) {
      try {
        this.cluster = null;
        this.logger.log('Couchbase 连接已关闭');
      } catch (error) {
        this.logger.error('关闭 Couchbase 连接时出错', error);
      }
    }
  }

  /**
   * 获取 Couchbase Cluster 实例
   */
  getCluster(): Cluster {
    if (!this.cluster) {
      throw new Error('Couchbase 连接尚未建立');
    }
    return this.cluster;
  }

  /**
   * 获取指定名称的 Bucket
   */
  getBucket(name?: string) {
    const bucketName = name || this.configService.get<string>('COUCHBASE_BUCKET', 'table_reservation');
    return this.getCluster().bucket(bucketName);
  }

  /**
   * 获取默认 Scope
   */
  getScope(scopeName: string = '_default') {
    return this.getBucket().scope(scopeName);
  }
}
