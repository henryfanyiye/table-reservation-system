import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRepository } from './repositories/user.repository';
import { IUser, UserRole } from './models/user.model';
import { LoginDto } from '@/common/dto/login.dto';
import { ResetPasswordDto } from '@/common/dto/ResetPassword.dto';
import { SmsService } from '../sms/sms.service';

// Mock bcrypt 模块
jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let smsService: jest.Mocked<SmsService>;

  const mockUser: Partial<IUser> = {
    id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    password: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    name: '测试用户',
    role: 'staff' as UserRole,
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByUsername: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockSmsService = {
      verifyCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    smsService = module.get(SmsService);

    // 默认配置返回值
    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'admin123',
        ADMIN_NAME: '系统管理员',
        JWT_SECRET: 'test-secret-key',
      };
      return config[key] || null;
    });

    // 重置 bcrypt mock
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('$10$some-salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('成功验证用户', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser as IUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');

      expect(result).toEqual(mockUser);
      expect(userRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
    });

    it('用户不存在时抛出异常', async () => {
      userRepository.findByUsername.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent', 'password')).rejects.toThrow(
        new UnauthorizedException('用户名或密码错误'),
      );
    });

    it('密码错误时抛出异常', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser as IUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('testuser', 'wrongpassword')).rejects.toThrow(
        new UnauthorizedException('用户名或密码错误'),
      );
    });
  });

  describe('login', () => {
    it('成功登录并返回 token', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser as IUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userRepository.update.mockResolvedValue(mockUser as IUser);
      jwtService.sign.mockReturnValue('mocked-jwt-token');

      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const result = await service.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('登录成功');
      expect(result.code).toBe('200');
      expect(result.data.access_token).toBe('mocked-jwt-token');
      expect(result.data.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        name: mockUser.name,
        role: mockUser.role,
        lastLoginAt: mockUser.lastLoginAt,
      });
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        lastLoginAt: expect.any(Date),
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('登录失败时抛出异常', async () => {
      userRepository.findByUsername.mockResolvedValue(null);

      const loginDto: LoginDto = {
        username: 'wronguser',
        password: 'wrongpassword',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resetPassword', () => {
    it('成功重置密码', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser as IUser);
      userRepository.update.mockResolvedValue(mockUser as IUser);
      const hashPasswordSpy = jest.spyOn(service, 'hashPassword').mockResolvedValue('new-hashed-password');

      const resetPasswordDto: ResetPasswordDto = {
        username: 'testuser',
        newPassword: 'newpassword123',
      };

      await service.resetPassword(resetPasswordDto);

      expect(service.hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: 'new-hashed-password',
      });

      hashPasswordSpy.mockRestore();
    });

    it('用户不存在时抛出异常', async () => {
      userRepository.findByUsername.mockResolvedValue(null);

      const resetPasswordDto: ResetPasswordDto = {
        username: 'nonexistent',
        newPassword: 'newpassword123',
      };

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow('用户不存在');
    });
  });

  describe('hashPassword', () => {
    it('成功哈希密码', async () => {
      const hashedPassword = await service.hashPassword('plainpassword');

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe('plainpassword');
      expect(hashedPassword.length).toBeGreaterThan(20);
    });
  });

  describe('validateToken', () => {
    it('成功验证 token', async () => {
      userRepository.findById.mockResolvedValue(mockUser as IUser);

      const payload = { sub: mockUser.id, username: mockUser.username };
      const result = await service.validateToken(payload);

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('token 对应用户不存在时返回 null', async () => {
      userRepository.findById.mockResolvedValue(null);

      const payload = { sub: '507f1f77bcf86cd799439011', username: 'nonexistent' };
      const result = await service.validateToken(payload);

      expect(result).toBeNull();
    });
  });

  describe('initializeDefaultAdmin', () => {
    it('管理员已存在时不创建新管理员', async () => {
      userRepository.findByUsername.mockResolvedValue(mockUser as IUser);

      await service['initializeDefaultAdmin']();

      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('管理员不存在时创建默认管理员', async () => {
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser as IUser);
      jest.spyOn(service, 'hashPassword' as never).mockResolvedValue('hashed-admin-password');

      await service['initializeDefaultAdmin']();

      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'admin',
        password: 'hashed-admin-password',
        name: '系统管理员',
        role: 'admin',
      });
    });

    it('使用自定义环境变量创建管理员', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          ADMIN_USERNAME: 'customadmin',
          ADMIN_PASSWORD: 'custompass',
          ADMIN_NAME: '自定义管理员',
          JWT_SECRET: 'test-secret-key',
        };
        return config[key] || null;
      });

      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser as IUser);
      jest.spyOn(service, 'hashPassword' as never).mockResolvedValue('hashed-custom-password');

      await service['initializeDefaultAdmin']();

      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'customadmin',
        password: 'hashed-custom-password',
        name: '自定义管理员',
        role: 'admin',
      });
    });
  });

  describe('validateCustomer - 客户登录验证', () => {
    it('验证码正确且用户已存在时返回用户', async () => {
      const existingCustomer: Partial<IUser> = {
        id: 'customer123',
        phone: '13800138000',
        username: 'customer_13800138000',
        name: '客户_8000',
        role: 'customer' as UserRole,
      };
      smsService.verifyCode.mockResolvedValue(true);
      userRepository.findByPhone.mockResolvedValue(existingCustomer as IUser);

      const result = await service['validateCustomer']('13800138000', '123456');

      expect(result).toEqual(existingCustomer);
      expect(smsService.verifyCode).toHaveBeenCalledWith('13800138000', '123456');
      expect(userRepository.findByPhone).toHaveBeenCalledWith('13800138000');
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('验证码正确且用户不存在时自动创建用户', async () => {
      const newCustomer: Partial<IUser> = {
        id: 'new-customer-id',
        phone: '13900139000',
        username: 'customer_13900139000',
        name: '客户_9000',
        role: 'customer' as UserRole,
      };
      smsService.verifyCode.mockResolvedValue(true);
      userRepository.findByPhone.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(newCustomer as IUser);

      const result = await service['validateCustomer']('13900139000', '654321');

      expect(result).toEqual(newCustomer);
      expect(smsService.verifyCode).toHaveBeenCalledWith('13900139000', '654321');
      expect(userRepository.findByPhone).toHaveBeenCalledWith('13900139000');
      expect(userRepository.create).toHaveBeenCalledWith({
        phone: '13900139000',
        username: 'customer_13900139000',
        name: '客户_9000',
        role: 'customer',
      });
    });

    it('验证码错误时抛出异常', async () => {
      smsService.verifyCode.mockResolvedValue(false);

      await expect(service['validateCustomer']('13800138000', '000000')).rejects.toThrow(
        new UnauthorizedException('验证码错误或已过期'),
      );

      expect(smsService.verifyCode).toHaveBeenCalledWith('13800138000', '000000');
      expect(userRepository.findByPhone).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser - 边界情况测试', () => {
    it('用户存在但没有密码时抛出异常', async () => {
      const userWithoutPassword: Partial<IUser> = {
        id: 'user123',
        username: 'testuser',
        name: '测试用户',
        role: 'staff' as UserRole,
        password: undefined,
      };
      userRepository.findByUsername.mockResolvedValue(userWithoutPassword as IUser);

      await expect(service.validateUser('testuser', 'password123')).rejects.toThrow(
        new UnauthorizedException('用户名或密码错误'),
      );
    });
  });
});
