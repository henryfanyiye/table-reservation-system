import { Injectable, Logger, OnModuleInit, UnauthorizedException, } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { IUser, UserRole } from './models/user.model';
import { LoginDto, UserType } from '@/common/dto/login.dto';
import { LoginPayload } from '@/common/interfaces/login-payload.interface';
import { ResetPasswordDto } from '@/common/dto/ResetPassword.dto';
import { SmsService } from '../sms/sms.service';
import { ConfigService } from '@nestjs/config';
import { DataResponseDto } from '@common/dto/response.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * 模块初始化时执行
   */
  async onModuleInit(): Promise<void> {
    await this.initializeDefaultAdmin();
  }

  /**
   * 初始化默认管理员用户
   */
  private async initializeDefaultAdmin(): Promise<void> {
    try {
      // 从环境变量获取管理员配置
      const adminUsername =
        this.configService.get<string>('ADMIN_USERNAME') || 'admin';
      const adminPassword =
        this.configService.get<string>('ADMIN_PASSWORD') || 'admin123';
      const adminName =
        this.configService.get<string>('ADMIN_NAME') || '系统管理员';

      // 检查管理员用户是否已存在
      const existingAdmin =
        await this.userRepository.findByUsername(adminUsername);

      if (existingAdmin) {
        this.logger.log(`默认管理员用户已存在: ${adminUsername}`);
        return;
      }

      // 创建默认管理员用户
      const hashedPassword = await this.hashPassword(adminPassword);

      await this.userRepository.create({
        username: adminUsername,
        password: hashedPassword,
        name: adminName,
        role: 'admin' as UserRole,
      });

      this.logger.log(`默认管理员用户创建成功: ${adminUsername}`);
    } catch (error) {
      this.logger.error('初始化默认管理员用户失败', error);
      throw error;
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(data: ResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findByUsername(data.username);

    if (!user) {
      throw new Error('用户不存在');
    }

    const hashedPassword = await this.hashPassword(data.newPassword);
    await this.userRepository.update(user.id!, { password: hashedPassword });

    this.logger.log(`密码已重置: ${data.username}`);

    return;
  }

  /**
   * 用户登录（统一入口）
   */
  async login(loginDto: LoginDto): Promise<DataResponseDto> {
    const user =
      loginDto.type === UserType.CUSTOMER
        ? await this.validateCustomer(loginDto.phone, loginDto.code)
        : await this.validateUser(loginDto.username, loginDto.password);

    return this.buildLoginResponse(user);
  }

  /**
   * 验证用户（员工登录）
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<IUser> {
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.password) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return user;
  }

  /**
   * 验证客户登录（手机号+验证码）
   */
  private async validateCustomer(
    phone: string,
    code: string,
  ): Promise<IUser> {
    const isCodeValid = await this.smsService.verifyCode(phone, code);
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    let user = await this.userRepository.findByPhone(phone);

    if (!user) {
      user = await this.userRepository.create({
        phone,
        username: `customer_${phone}`,
        name: `客户_${phone.slice(-4)}`,
        role: 'customer' as UserRole,
      });
      this.logger.log(`自动创建客户账号: ${phone}`);
    }

    return user;
  }

  /**
   * 构建登录响应
   */
  private async buildLoginResponse(
    user: IUser,
  ): Promise<DataResponseDto> {
    await this.userRepository.update(user.id!, {
      lastLoginAt: new Date(),
    });

    const payload: LoginPayload = {
      sub: user.id!,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    const response = new DataResponseDto();
    response.success = true;
    response.message = '登录成功';
    response.code = '200';
    response.data = {
      access_token,
      user: {
        id: user.id!,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        lastLoginAt: user.lastLoginAt,
      },
    };
    return response;
  }

  /**
   * 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * 验证 JWT Token
   */
  async validateToken(payload: LoginPayload): Promise<IUser | null> {
    return this.userRepository.findById(payload.sub);
  }

}
