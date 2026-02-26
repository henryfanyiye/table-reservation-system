import { Schema } from 'ottoman';
import { ottomanInstance } from '@common/database/database.service';

/**
 * 时段配置
 */
export type TimeSlotConfig = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
};

/**
 * 桌型配置
 */
export type TableConfig = {
  id: string;
  name: string;
  seats: number;
  count: number;
};

/**
 * 预订规则
 */
export type BookingRules = {
  minDaysAdvance: number;
  maxDaysAdvance: number;
};

/**
 * 门店模型接口
 */
export interface IStore {
  id?: string;
  name: string;
  address: string;
  phone?: string;
  tableConfig: TableConfig[];
  timeSlotConfig: TimeSlotConfig[];
  bookingRules: BookingRules;
  description: string;
  lastConfigUpdatedAt?: Date;
  lastConfigUpdatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Store Schema 定义
 */
const storeSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  phone: String,
  tableConfig: {
    type: [Object],
    default: [],
  },
  timeSlotConfig: {
    type: [Object],
    default: [],
  },
  bookingRules: {
    type: Object,
    default: {},
  },
  description: {
    type: String,
    default: '',
  },
  lastConfigUpdatedAt: Date,
  lastConfigUpdatedBy: String,
}, {
  timestamps: true,
});

// 创建索引
storeSchema.index.findByName = {
  by: ['name'],
  type: 'n1ql',
};

export const StoreModel = ottomanInstance.model('Store', storeSchema, {
  collectionName: 'Store'
});
