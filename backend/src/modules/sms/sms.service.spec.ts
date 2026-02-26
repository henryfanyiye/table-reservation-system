import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { RedisService } from '@common/redis';
import { BaseResponseDto } from '@common/dto/response.dto';

describe('SmsService', () => {
  let service: SmsService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockRedisService = {
      setEx: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationCode', () => {
    it('成功发送验证码', async () => {
      redisService.setEx.mockResolvedValue('OK');

      const result = await service.sendVerificationCode('13800138000');

      expect(result).toBeInstanceOf(BaseResponseDto);
      expect(result.success).toBe(true);
      expect(result.code).toBe('200');
      expect(result.message).toBe('Success');
      expect(redisService.setEx).toHaveBeenCalledWith(
        'sms:code:13800138000',
        300,
        '123456',
      );
    });

    it('Redis 错误时返回失败响应', async () => {
      redisService.setEx.mockRejectedValue(new Error('Redis 连接失败'));

      const result = await service.sendVerificationCode('13800138000');

      expect(result.success).toBe(false);
      expect(result.code).toBe('400');
      expect(result.message).toBe('Redis 连接失败');
      expect(redisService.setEx).toHaveBeenCalledWith(
        'sms:code:13800138000',
        300,
        '123456',
      );
    });

    it('使用不同手机号发送验证码', async () => {
      redisService.setEx.mockResolvedValue('OK');

      const phone = '13912345678';
      await service.sendVerificationCode(phone);

      expect(redisService.setEx).toHaveBeenCalledWith(`sms:code:${phone}`, 300, '123456');
    });
  });

  describe('verifyCode', () => {
    it('成功验证验证码', async () => {
      redisService.get.mockResolvedValue('123456');
      redisService.del.mockResolvedValue(1);

      const result = await service.verifyCode('13800138000', '123456');

      expect(result).toBe(true);
      expect(redisService.get).toHaveBeenCalledWith('sms:code:13800138000');
      expect(redisService.del).toHaveBeenCalledWith('sms:code:13800138000');
    });

    it('验证码不存在时返回 false', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.verifyCode('13800138000', '123456');

      expect(result).toBe(false);
      expect(redisService.get).toHaveBeenCalledWith('sms:code:13800138000');
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('验证码不匹配时返回 false', async () => {
      redisService.get.mockResolvedValue('654321');

      const result = await service.verifyCode('13800138000', '123456');

      expect(result).toBe(false);
      expect(redisService.get).toHaveBeenCalledWith('sms:code:13800138000');
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('验证码过期后返回 false', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.verifyCode('13800138000', '123456');

      expect(result).toBe(false);
      expect(redisService.get).toHaveBeenCalledWith('sms:code:13800138000');
    });

    it('验证成功后删除验证码（一次性使用）', async () => {
      redisService.get.mockResolvedValue('123456');
      redisService.del.mockResolvedValue(1);

      await service.verifyCode('13800138000', '123456');

      expect(redisService.del).toHaveBeenCalledTimes(1);
      expect(redisService.del).toHaveBeenCalledWith('sms:code:13800138000');
    });
  });
});
