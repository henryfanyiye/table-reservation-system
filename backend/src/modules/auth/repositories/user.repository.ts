import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@common/database/database.service';
import { IUser, UserModel } from '../models/user.model';
import { SearchConsistency } from 'ottoman';

export interface IUserRepository {
  findByUsername(username: string): Promise<IUser | null>;

  findByPhone(phone: string): Promise<IUser | null>;

  findById(id: string): Promise<IUser | null>;

  create(userData: Partial<IUser>): Promise<IUser>;

  update(id: string, updates: Partial<IUser>): Promise<IUser | null>;

  updateLastLogin(id: string): Promise<void>;
}

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findByUsername(username: string): Promise<IUser | null> {
    try {
      const result = await UserModel.findByUsername(username, { consistency: SearchConsistency.LOCAL });
      return result.rows[0] || null;
    } catch (error) {
      this.logger.warn(`findByUsername failed for username: ${username}`, error);
      return null;
    }
  }

  async findByPhone(phone: string): Promise<IUser | null> {
    try {
      const result = await UserModel.findByPhone(phone, { consistency: SearchConsistency.LOCAL });
      return result.rows[0] || null;
    } catch (error) {
      this.logger.warn(`findByPhone failed for phone: ${phone}`, error);
      return null;
    }
  }

  async findById(id: string): Promise<IUser | null> {
    try {
      return await UserModel.findById(id);
    } catch (error) {
      this.logger.warn(`findById failed for id: ${id}`, error);
      return null;
    }
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    return await UserModel.create(userData);
  }

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    try {
      const user = await UserModel.findById(id);
      if (!user) {
        return null;
      }
      Object.assign(user, updates);
      return await user.save();
    } catch (error) {
      this.logger.error(`update failed for id: ${id}`, error);
      return null;
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      const user = await UserModel.findById(id);
      if (user) {
        user.lastLoginAt = new Date();
        await user.save();
      }
    } catch (error) {
      this.logger.warn(`updateLastLogin failed for id: ${id}`, error);
      return;
    }
  }
}
