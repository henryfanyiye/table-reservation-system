/**
 * Redis 模块常量
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_OPTIONS = 'REDIS_OPTIONS';

/**
 * Redis 连接选项
 */
export interface RedisModuleOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
}
