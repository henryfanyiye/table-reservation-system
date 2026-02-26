import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { REDIS_OPTIONS, type RedisModuleOptions } from './redis.constants';

/**
 * Lua 脚本常量
 */
const LUA_SCRIPTS = {
  /**
   * 检查并增加预订计数
   * KEYS[1]: {tableConfigId}:{timeSlotId}:{reservationDate}
   * ARGV[1]: totalTables (桌型总数)
   * ARGV[2]: ttl (过期时间，秒)
   */
  checkAndIncrement: `
local current = tonumber(redis.call('GET', KEYS[1])) or 0
local total = tonumber(ARGV[1])

if current >= total then
  return {0, total, current, 'fully_booked'}
end

local newCount = redis.call('INCR', KEYS[1])

if ARGV[2] then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end

return {1, total, newCount, 'ok'}
  `.trim(),

  /**
   * 减少预订计数
   * KEYS[1]: {tableConfigId}:{timeSlotId}:{reservationDate}
   */
  decrement: `
local current = tonumber(redis.call('GET', KEYS[1])) or 0

if current > 0 then
  local newCount = redis.call('DECR', KEYS[1])
  return {1, newCount, 'ok'}
end

return {0, current, 'already_zero'}
  `.trim(),
};

/**
 * Redis 服务
 * 统一管理 Redis 连接和操作
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: RedisClientType;

  constructor(@Inject(REDIS_OPTIONS) private readonly options: RedisModuleOptions) {
    this.client = createClient({
      socket: {
        host: options.host || 'localhost',
        port: options.port || 6379,
      },
      password: options.password,
      database: options.db || 0,
      url: options.url,
    }) as RedisClientType;

    this.setupEventHandlers();
  }

  /**
   * 模块初始化时连接 Redis
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Redis client connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  /**
   * 模块销毁时断开 Redis 连接
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
      this.logger.log('Redis client disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Redis client', error);
    }
  }

  /**
   * 设置 Redis 事件处理器
   */
  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connected');
    });

    this.client.on('disconnect', () => {
      this.logger.warn('Redis Client Disconnected');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis Client Reconnecting...');
    });
  }

  /**
   * 执行 Redis EVAL 命令
   */
  async eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown> {
    return this.client.eval(script, {
      keys: args.slice(0, numKeys) as string[],
      arguments: args.slice(numKeys).map(String) as string[],
    });
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * 设置值并设置过期时间
   */
  async setEx(key: string, seconds: number, value: string): Promise<string | null> {
    return await this.client.setEx(key, seconds, value);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  /**
   * 检查并增加预订数量
   * 使用 Lua 脚本保证原子性
   *
   * @param tableConfigId 桌型配置ID
   * @param timeSlotId 时段ID
   * @param reservationDate 预订日期 (YYYY-MM-DD)
   * @param totalTables 桌型总数
   * @param ttl 过期时间（秒），默认 2 天
   * @returns [success: number, total: number, current: number, message: string]
   */
  async checkAndIncrementReservationCount(
    tableConfigId: string,
    timeSlotId: string,
    reservationDate: string,
    totalTables: number,
    ttl: number = 172800, // 2 天
  ): Promise<[number, number, number, string]> {
    const key = `${tableConfigId}:${timeSlotId}:${reservationDate}`;

    const result = (await this.eval(
      LUA_SCRIPTS.checkAndIncrement,
      1,
      key,
      totalTables,
      ttl,
    )) as [number, number, number, string];

    return result;
  }

  /**
   * 减少预订数量（取消时调用）
   * 使用 Lua 脚本保证计数不会小于 0
   *
   * @param tableConfigId 桌型配置ID
   * @param timeSlotId 时段ID
   * @param reservationDate 预订日期 (YYYY-MM-DD)
   * @returns [success: number, current: number, message: string]
   */
  async decrementReservationCount(
    tableConfigId: string,
    timeSlotId: string,
    reservationDate: string,
  ): Promise<[number, number, string]> {
    const key = `${tableConfigId}:${timeSlotId}:${reservationDate}`;

    const result = (await this.eval(
      LUA_SCRIPTS.decrement,
      1,
      key,
    )) as [number, number, string];

    return result;
  }
}
