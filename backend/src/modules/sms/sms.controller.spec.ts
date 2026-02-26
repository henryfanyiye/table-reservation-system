import { Test, TestingModule } from '@nestjs/testing';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { BaseResponseDto } from '@common/dto/response.dto';

describe('SmsController', () => {
  let controller: SmsController;
  let smsService: jest.Mocked<SmsService>;

  const mockSuccessResponse: BaseResponseDto = {
    success: true,
    code: undefined,
    message: undefined,
  };

  const mockFailureResponse: BaseResponseDto = {
    success: false,
    code: '400',
    message: 'Redis 连接失败',
  };

  beforeEach(async () => {
    const mockSmsService = {
      sendVerificationCode: jest.fn(),
      verifyCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmsController],
      providers: [
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
      ],
    }).compile();

    controller = module.get<SmsController>(SmsController);
    smsService = module.get(SmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationCode', () => {
    it('成功发送验证码', async () => {
      smsService.sendVerificationCode.mockResolvedValue(mockSuccessResponse);

      const sendSmsDto = { phone: '13800138000' };
      const result = await controller.sendVerificationCode(sendSmsDto);

      expect(result).toEqual(mockSuccessResponse);
      expect(smsService.sendVerificationCode).toHaveBeenCalledWith('13800138000');
      expect(smsService.sendVerificationCode).toHaveBeenCalledTimes(1);
    });

    it('发送失败时返回错误响应', async () => {
      smsService.sendVerificationCode.mockResolvedValue(mockFailureResponse);

      const sendSmsDto = { phone: '13800138000' };
      const result = await controller.sendVerificationCode(sendSmsDto);

      expect(result.success).toBe(false);
      expect(result.code).toBe('400');
      expect(result.message).toBe('Redis 连接失败');
      expect(smsService.sendVerificationCode).toHaveBeenCalledWith('13800138000');
    });

    it('处理不同手机号', async () => {
      smsService.sendVerificationCode.mockResolvedValue(mockSuccessResponse);

      const phoneNumbers = ['13800138000', '13912345678', '18688889999'];

      for (const phone of phoneNumbers) {
        await controller.sendVerificationCode({ phone });
        expect(smsService.sendVerificationCode).toHaveBeenCalledWith(phone);
      }

      expect(smsService.sendVerificationCode).toHaveBeenCalledTimes(phoneNumbers.length);
    });
  });

  describe('verifyCode', () => {
    it('验证码正确时返回成功响应', async () => {
      smsService.verifyCode.mockResolvedValue(true);

      const verifySmsDto = { phone: '13800138000', code: '123456' };
      const result = await controller.verifyCode(verifySmsDto);

      expect(result).toEqual({
        success: true,
        message: '验证成功',
      });
      expect(smsService.verifyCode).toHaveBeenCalledWith('13800138000', '123456');
    });

    it('验证码错误或过期时返回失败响应', async () => {
      smsService.verifyCode.mockResolvedValue(false);

      const verifySmsDto = { phone: '13800138000', code: '000000' };
      const result = await controller.verifyCode(verifySmsDto);

      expect(result).toEqual({
        success: false,
        message: '验证码无效或已过期',
      });
      expect(smsService.verifyCode).toHaveBeenCalledWith('13800138000', '000000');
    });

    it('处理不同验证码', async () => {
      smsService.verifyCode.mockImplementation(async (phone: string, code: string) => {
        return code === '888888';
      });

      const validSmsDto = { phone: '13800138000', code: '888888' };
      const validResult = await controller.verifyCode(validSmsDto);
      expect(validResult.success).toBe(true);

      const invalidSmsDto = { phone: '13800138000', code: '999999' };
      const invalidResult = await controller.verifyCode(invalidSmsDto);
      expect(invalidResult.success).toBe(false);
    });
  });
});
