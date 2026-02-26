import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// 动态导入 DailyRotateFile 以避免类型问题
const DailyRotateFile = require('winston-daily-rotate-file');

// 脱敏函数
function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const masked: any = Array.isArray(data) ? [] : {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      // 电话号码脱敏: 保留前3后4位
      if (key === 'phone' && typeof data[key] === 'string') {
        masked[key] = maskPhone(data[key]);
      }
      // 邮箱脱敏: 保留首字符和域名
      else if (key === 'email' && typeof data[key] === 'string') {
        masked[key] = maskEmail(data[key]);
      }
      // 密码完全隐藏
      else if (key === 'password' || key === 'smsCode') {
        masked[key] = '********';
      }
      // 递归处理嵌套对象
      else if (typeof data[key] === 'object') {
        masked[key] = maskSensitiveData(data[key]);
      } else {
        masked[key] = data[key];
      }
    }
  }

  return masked;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return local.charAt(0) + '***@' + domain;
}

// 自定义格式化器，包含脱敏
const sensitiveDataFormat = printf(
  ({ level, message, context, timestamp, ...meta }) => {
    const maskedContext = context ? maskSensitiveData(context) : {};
    const metaKeys = Object.keys(meta);
    return `${timestamp as string} [${level}] [${(context as any)?.context || 'App'}] ${message} ${JSON.stringify(maskedContext)} ${
      metaKeys.length > 0 ? JSON.stringify(meta) : ''
    }`;
  },
);

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          level: process.env.LOG_LEVEL || 'info',
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            colorize(),
            printf(({ level, message, context, timestamp }) => {
              return `${timestamp as string} [${level}]: ${message} ${
                context ? JSON.stringify(maskSensitiveData(context)) : ''
              }`;
            }),
          ),
        }),
        new DailyRotateFile({
          dirname: 'logs',
          filename: 'application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            sensitiveDataFormat,
          ),
        }),
        new DailyRotateFile({
          dirname: 'logs',
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            sensitiveDataFormat,
          ),
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}

// 导出脱敏工具函数供其他模块使用
export { maskPhone, maskEmail, maskSensitiveData };
