import { Schema } from 'ottoman';
import { ottomanInstance } from '@common/database/database.service';

/**
 * 预订状态枚举
 */
export enum ReservationStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/**
 * 客人信息接口
 */
export interface Customer {
  name: string;
  phone: string;
  email?: string;
}

/**
 * 预订模型接口
 */
export interface IReservation {
  id?: string;
  userId?: string;
  customer: Customer;
  reservationDate: Date;
  storeId?: string;
  storeName?: string;
  timeSlot: string;
  timeSlotName?: string;
  tableConfigId?: string;
  tableConfigName?: string;
  status: ReservationStatus;
  specialRequests?: string;
  estimatedArrivalTime?: string;
  verificationCode?: string;
  confirmedAt?: Date;
  confirmedBy?: string;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  cancelledBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Reservation Schema 定义
 */
const reservationSchema = new Schema({
  userId: String,
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
  },
  reservationDate: {
    type: Date,
    required: true,
  },
  storeId: String,
  storeName: String,
  timeSlot: {
    type: String,
    required: true,
  },
  timeSlotName: String,
  tableConfigId: String,
  tableConfigName: String,
  status: {
    type: String,
    required: true,
    enum: Object.values(ReservationStatus),
    default: ReservationStatus.REQUESTED,
  },
  specialRequests: String,
  estimatedArrivalTime: String,
  verificationCode: String,
  confirmedAt: Date,
  confirmedBy: String,
  completedAt: Date,
  cancelledAt: Date,
  cancelReason: String,
  cancelledBy: String,
}, {
  timestamps: true,
});

// 创建索引
reservationSchema.index.findByPhoneAndDate = {
  by: ['customer.phone', 'reservationDate'],
  type: 'n1ql',
};

reservationSchema.index.findByStatusAndDate = {
  by: ['status', 'reservationDate'],
  type: 'n1ql',
};

reservationSchema.index.findByStore = {
  by: ['storeId'],
  type: 'n1ql',
};

reservationSchema.index.findByUserId = {
  by: ['userId'],
  type: 'n1ql',
};

export const ReservationModel = ottomanInstance.model('Reservation', reservationSchema, {
  collectionName: 'Reservation'
});
