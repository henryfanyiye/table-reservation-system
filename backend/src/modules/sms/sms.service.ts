import { Injectable } from '@nestjs/common';
import { RedisService } from '@common/redis';
import { BaseResponseDto } from '@common/dto/response.dto';

@Injectable()
export class SmsService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 发送验证码
   */
  async sendVerificationCode(phone: string): Promise<BaseResponseDto> {
    const code = '123456';
    const key = `sms:code:${phone}`;
    const ttl = 300; // 5分钟

    const response = new BaseResponseDto();
    try {
      // 存储验证码
      await this.redisService.setEx(key, ttl, code);
      return response;
    } catch (error) {
      response.code = '400';
      response.message = error.message;
      response.success = false;
      return response;
    }
  }

  /**
   * 验证验证码
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    const key = `sms:code:${phone}`;
    const storeCode = await this.redisService.get(key);

    if (!storeCode) {
      return false; // 验证码不存在或已过期
    }

    // 验证码匹配
    if (storeCode !== code) {
      return false;
    }

    // 验证成功，删除验证码（一次性使用）
    await this.redisService.del(key);

    return true;
  }
}
