import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DataResponseDto } from '@common/dto/response.dto';
import { LoginDto } from '@/common/dto/login.dto';
import { ResetPasswordDto } from '@/common/dto/ResetPassword.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockSuccessResponse: DataResponseDto = {
    success: true,
    message: '登录成功',
    code: '200',
    data: {
      access_token: 'mocked-jwt-token',
      user: {
        id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        name: '测试用户',
        role: 'staff',
        lastLoginAt: new Date(),
      },
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('成功登录', async () => {
      authService.login.mockResolvedValue(mockSuccessResponse);

      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockSuccessResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('登录失败时抛出异常', async () => {
      const mockErrorResponse = {
        success: false,
        message: '用户名或密码错误',
        code: '401',
        data: null,
      };
      authService.login.mockResolvedValue(mockErrorResponse as any);

      const loginDto: LoginDto = {
        username: 'wronguser',
        password: 'wrongpassword',
      };

      const result = await controller.login(loginDto);

      expect(result.success).toBe(false);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('resetPassword', () => {
    it('成功重置密码', async () => {
      authService.resetPassword.mockResolvedValue(undefined);

      const resetPasswordDto: ResetPasswordDto = {
        username: 'testuser',
        newPassword: 'newpassword123',
      };

      await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('用户不存在时抛出异常', async () => {
      authService.resetPassword.mockRejectedValue(new Error('用户不存在'));

      const resetPasswordDto: ResetPasswordDto = {
        username: 'nonexistent',
        newPassword: 'newpassword123',
      };

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow('用户不存在');
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });
});
