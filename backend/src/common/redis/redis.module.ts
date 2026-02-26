import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { REDIS_OPTIONS, RedisModuleOptions } from './redis.constants';

/**
 * Redis 模块
 * 提供统一的 Redis 连接和操作服务
 */
@Module({})
export class RedisModule {
  /**
   * 使用 ConfigService 动态注册 Redis 模块
   */
  static registerAsync(): DynamicModule {
    const optionsProvider: Provider = {
      provide: REDIS_OPTIONS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RedisModuleOptions => ({
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        password: configService.get<string>('REDIS_PASSWORD'),
        db: configService.get<number>('REDIS_DB', 0),
        url: configService.get<string>('REDIS_URL'),
      }),
    };

    return {
      module: RedisModule,
      providers: [optionsProvider, RedisService],
      exports: [RedisService],
      global: true, // 设为全局模块，所有模块都可以使用
    };
  }
}
