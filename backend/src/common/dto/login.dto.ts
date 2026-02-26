import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export enum UserType {
  CUSTOMER = 'customer',
  STAFF = 'staff',
}

export class LoginDto {
  @IsNotEmpty()
  @IsEnum(UserType)
  type: UserType;

  @ValidateIf((o: LoginDto) => o.type === UserType.STAFF)
  @IsNotEmpty()
  @IsString()
  username: string;

  @ValidateIf((o: LoginDto) => o.type === UserType.STAFF)
  @IsNotEmpty()
  @IsString()
  password: string;

  @ValidateIf((o: LoginDto) => o.type === UserType.CUSTOMER)
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ValidateIf((o: LoginDto) => o.type === UserType.CUSTOMER)
  @IsNotEmpty()
  @IsString()
  code: string;
}
