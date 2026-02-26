import { Body, Controller, Post } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SendSmsDto } from '@/common/dto/send-sms.dto';
import { VerifySmsDto } from '@/common/dto/verify-sms.dto';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  async sendVerificationCode(@Body() sendSmsDto: SendSmsDto) {
    return this.smsService.sendVerificationCode(sendSmsDto.phone);
  }

  @Post('verify')
  async verifyCode(@Body() verifySmsDto: VerifySmsDto) {
    const isValid = await this.smsService.verifyCode(
      verifySmsDto.phone,
      verifySmsDto.code,
    );
    return {
      success: isValid,
      message: isValid ? '验证成功' : '验证码无效或已过期',
    };
  }
}
