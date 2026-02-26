import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { IUser, UserModel, UserRole } from '../models/user.model';
import { DatabaseService } from '@common/database/database.service';
import { DocumentNotFoundError } from 'ottoman';
import { Logger } from '@nestjs/common';

describe('UserRepository', () => {
  let repository: UserRepository;
  let databaseService: jest.Mocked<DatabaseService>;
  let logger: jest.Mocked<Logger>;

  const mockUser: IUser = {
    id: '507f1f77bcf86cd799439011',
    username: 'admin',
    password: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    name: '系统管理员',
    role: 'admin' as UserRole,
    lastLoginAt: new Date('2024-06-15T10:30:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-15T10:30:00.000Z'),
  };

  const mockStaffUser: IUser = {
    id: '507f1f77bcf86cd799439012',
    username: 'staff01',
    password: '$2b$10$abcdefghijklmnopqrstuvwxyz',
    name: '员工1',
    role: 'staff' as UserRole,
    lastLoginAt: new Date('2024-06-15T09:00:00.000Z'),
    createdAt: new Date('2024-02-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-15T09:00:00.000Z'),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      getCluster: jest.fn(),
      getBucket: jest.fn(),
      getScope: jest.fn(),
    } as unknown as jest.Mocked<DatabaseService>;

    // Mock UserModel methods
    jest.spyOn(UserModel, 'findByUsername').mockResolvedValue({
      rows: [mockUser],
    } as any);
    jest.spyOn(UserModel, 'findById').mockResolvedValue(mockUser as any);
    jest.spyOn(UserModel, 'create').mockResolvedValue(mockUser as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    databaseService = mockDatabaseService;

    // Mock Logger
    logger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    (repository as any).logger = logger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('成功根据用户名查找用户', async () => {
      jest.spyOn(UserModel, 'findByUsername').mockResolvedValue({
        rows: [mockUser],
      } as any);

      const result = await repository.findByUsername('admin');

      expect(result).toEqual(mockUser);
    });

    it('用户名不存在时返回 null', async () => {
      jest.spyOn(UserModel, 'findByUsername').mockResolvedValue({
        rows: [],
      } as any);

      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('查找员工用户', async () => {
      jest.spyOn(UserModel, 'findByUsername').mockResolvedValue({
        rows: [mockStaffUser],
      } as any);

      const result = await repository.findByUsername('staff01');

      expect(result).toEqual(mockStaffUser);
      expect(result.role).toBe('staff');
    });
  });

  describe('findById', () => {
    it('成功根据 ID 查找用户', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValue(mockUser as any);

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockUser);
    });

    it('ID 不存在时返回 null', async () => {
      jest.spyOn(UserModel, 'findById').mockRejectedValue(new DocumentNotFoundError('Document not found'));

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('查找管理员用户', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValue(mockUser as any);

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result.role).toBe('admin');
    });
  });

  describe('create', () => {
    it('成功创建管理员用户', async () => {
      const userData = {
        username: 'newadmin',
        password: 'hashedpassword',
        name: '新管理员',
        role: 'admin' as UserRole,
      };

      const newUser = { ...userData, id: 'new-id' };
      const mockModelInstance = {
        save: jest.fn().mockResolvedValue(newUser),
      };
      jest.spyOn(UserModel, 'create').mockResolvedValue(newUser as any);

      const result = await repository.create(userData);

      expect(result).toBeDefined();
      expect(result.username).toBe(userData.username);
    });

    it('成功创建员工用户', async () => {
      const userData = {
        username: 'newstaff',
        password: 'hashedpassword',
        name: '新员工',
        role: 'staff' as UserRole,
      };

      const newUser = { ...userData, id: 'new-id' };
      jest.spyOn(UserModel, 'create').mockResolvedValue(newUser as any);

      const result = await repository.create(userData);

      expect(result).toBeDefined();
      expect(result.role).toBe('staff');
    });
  });

  describe('update', () => {
    it('成功更新用户信息', async () => {
      const updatedUser = {
        ...mockUser,
        name: '更新后的管理员',
      };

      const mockModelInstance = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(updatedUser),
      };
      jest.spyOn(UserModel, 'findById').mockResolvedValue(mockModelInstance as any);

      const result = await repository.update('507f1f77bcf86cd799439011', {
        name: '更新后的管理员',
      });

      expect(result).toEqual(updatedUser);
    });

    it('更新不存在的用户时返回 null', async () => {
      jest.spyOn(UserModel, 'findById').mockRejectedValue(new DocumentNotFoundError('Document not found'));

      const result = await repository.update('nonexistent-id', {
        name: '新名称',
      });

      expect(result).toBeNull();
    });

    it('更新用户角色', async () => {
      const updatedUser = {
        ...mockStaffUser,
        role: 'admin' as UserRole,
      };

      const mockModelInstance = {
        ...mockStaffUser,
        save: jest.fn().mockResolvedValue(updatedUser),
      };
      jest.spyOn(UserModel, 'findById').mockResolvedValue(mockModelInstance as any);

      const result = await repository.update('507f1f77bcf86cd799439012', {
        role: 'admin' as UserRole,
      });

      expect(result.role).toBe('admin');
    });
  });

  describe('updateLastLogin', () => {
    it('成功更新最后登录时间', async () => {
      // 创建一个可变的 mock 实例
      const mockModelInstance = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(undefined),
      };
      jest.spyOn(UserModel, 'findById').mockResolvedValue(mockModelInstance as any);

      await repository.updateLastLogin('507f1f77bcf86cd799439011');

      // 验证 lastLoginAt 已被更新为最近的时间
      expect(mockModelInstance.lastLoginAt).toBeInstanceOf(Date);
      expect(mockModelInstance.lastLoginAt.getTime()).toBeGreaterThanOrEqual(new Date('2024-06-15T10:30:00.000Z').getTime());
      expect(mockModelInstance.save).toHaveBeenCalled();
    });

    it('更新不存在用户时不抛出错误', async () => {
      jest.spyOn(UserModel, 'findById').mockRejectedValue(new DocumentNotFoundError('Document not found'));

      await expect(
        repository.updateLastLogin('nonexistent-id')
      ).resolves.toBeUndefined();
    });
  });

  describe('日志记录', () => {
    it('findByUsername 失败时记录警告日志', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(UserModel, 'findByUsername').mockRejectedValue(error);

      await repository.findByUsername('admin');

      expect(logger.warn).toHaveBeenCalledWith(
        'findByUsername failed for username: admin',
        error
      );
    });

    it('findByPhone 失败时记录警告日志', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(UserModel, 'findByPhone').mockRejectedValue(error);

      await repository.findByPhone('13800138000');

      expect(logger.warn).toHaveBeenCalledWith(
        'findByPhone failed for phone: 13800138000',
        error
      );
    });

    it('findById 失败时记录警告日志', async () => {
      const error = new Error('Document not found');
      jest.spyOn(UserModel, 'findById').mockRejectedValue(error);

      await repository.findById('nonexistent-id');

      expect(logger.warn).toHaveBeenCalledWith(
        'findById failed for id: nonexistent-id',
        error
      );
    });

    it('update 失败时记录错误日志', async () => {
      const error = new Error('Update failed');
      jest.spyOn(UserModel, 'findById').mockRejectedValue(error);

      await repository.update('some-id', { name: '新名称' });

      expect(logger.error).toHaveBeenCalledWith(
        'update failed for id: some-id',
        error
      );
    });

    it('updateLastLogin 失败时记录警告日志', async () => {
      const error = new Error('Update failed');
      jest.spyOn(UserModel, 'findById').mockRejectedValue(error);

      await repository.updateLastLogin('some-id');

      expect(logger.warn).toHaveBeenCalledWith(
        'updateLastLogin failed for id: some-id',
        error
      );
    });
  });
});
