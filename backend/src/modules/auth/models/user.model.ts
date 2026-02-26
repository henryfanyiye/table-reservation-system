import { Schema } from 'ottoman';
import { ottomanInstance } from '@common/database/database.service';

/**
 * 用户角色类型
 */
export type UserRole = 'admin' | 'staff' | 'customer';

/**
 * 用户模型定义
 */
export interface IUser {
  id?: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  phone?: string;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Schema 定义
 */
const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'staff', 'customer'],
  },
  phone: {
    type: String,
    required: false,
  },
  lastLoginAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// 创建索引
userSchema.index.findByUsername = {
  by: ['username'],
  type: 'n1ql',
};

userSchema.index.findByPhone = {
  by: ['phone'],
  type: 'n1ql',
};

export const UserModel = ottomanInstance.model('User', userSchema, {
  collectionName: 'User'
});
