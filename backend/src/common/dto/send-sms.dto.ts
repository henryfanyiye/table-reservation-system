import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendSmsDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, {
    message: '请输入正确的手机号码',
  })
  phone: string;
}
