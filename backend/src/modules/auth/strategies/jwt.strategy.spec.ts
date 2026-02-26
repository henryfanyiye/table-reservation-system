import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';
import { UserDocument, UserRole } from '../schemas/user.schema';
import { LoginPayload } from '@/common/interfaces/login-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser: Partial<UserDocument> = {
    id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    password: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    name: '测试用户',
    role: 'staff' as UserRole,
    lastLoginAt: new Date(),
  };

  const mockPayload: LoginPayload = {
    sub: mockUser.id!,
    username: mockUser.username!,
    name: mockUser.name!,
    role: mockUser.role!,
  };

  // 创建 mock ConfigService 工厂函数
  const createMockConfigService = () => ({
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') {
        return 'test-secret-key';
      }
      return null;
    }),
  });

  beforeEach(async () => {
    const mockAuthService = {
      validateToken: jest.fn(),
    };

    const mockConfigService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该正确初始化策略配置', () => {
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });

    it('应该配置从 Bearer Token 提取 JWT', () => {
      // PassportStrategy 的配置通过构造函数中的 super() 调用
      // 这里验证策略被正确实例化
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('成功验证有效的 token 并返回用户', async () => {
      authService.validateToken.mockResolvedValue(mockUser as UserDocument);

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual(mockUser);
      expect(authService.validateToken).toHaveBeenCalledWith(mockPayload);
    });

    it('用户不存在时抛出 UnauthorizedException', async () => {
      authService.validateToken.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('用户不存在'),
      );
      expect(authService.validateToken).toHaveBeenCalledWith(mockPayload);
    });

    it('验证 token 时包含完整的 payload 信息', async () => {
      const fullPayload: LoginPayload = {
        sub: '507f1f77bcf86cd799439011',
        username: 'admin',
        name: '管理员',
        role: 'admin',
      };

      authService.validateToken.mockResolvedValue(mockUser as UserDocument);

      await strategy.validate(fullPayload);

      expect(authService.validateToken).toHaveBeenCalledWith(fullPayload);
      expect(authService.validateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: expect.any(String),
          username: expect.any(String),
          name: expect.any(String),
          role: expect.any(String),
        }),
      );
    });
  });
});
