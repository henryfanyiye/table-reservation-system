import { Field, InputType, Int, ObjectType, registerEnumType, } from '@nestjs/graphql';
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, MaxLength, } from 'class-validator';
import { ReservationStatus } from '../../modules/reservation/models/reservation.model';

// ============================================
// 注册 GraphQL 枚举
// ============================================
registerEnumType(ReservationStatus, {
  name: 'ReservationStatus',
  description: '预订状态',
});

// ============================================
// Object Types
// ============================================

/**
 * 客人信息类型
 */
@ObjectType()
export class CustomerType {
  @Field()
  name: string;

  @Field()
  phone: string;

  @Field({ nullable: true })
  email?: string;
}

/**
 * 分页信息类型
 */
@ObjectType()
export class PageInfoType {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}

/**
 * 预订类型
 */
@ObjectType()
export class ReservationType {
  @Field()
  id: string;

  @Field({ nullable: true })
  userId?: string;

  @Field(() => CustomerType)
  customer: CustomerType;

  @Field(() => String, { description: '预订日期 (YYYY-MM-DD)' })
  reservationDate: string;

  @Field()
  timeSlot: string;

  @Field()
  timeSlotName: string;

  @Field(() => Int)
  tableSize: number;

  @Field({ nullable: true })
  tableConfigId?: string;

  @Field({ nullable: true })
  tableConfigName?: string;

  @Field(() => ReservationStatus)
  status: ReservationStatus;

  @Field({ nullable: true })
  specialRequests?: string;

  @Field({ nullable: true, description: '预计到达时间 (HH:mm 格式，如: 18:30)' })
  estimatedArrivalTime?: string;

  @Field({ nullable: true })
  confirmedAt?: Date;

  @Field({ nullable: true })
  confirmedBy?: string;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field({ nullable: true })
  cancelReason?: string;

  @Field({ nullable: true })
  cancelledBy?: string;

  @Field({ nullable: true })
  storeId?: string;

  @Field({ nullable: true })
  storeName?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

/**
 * 预订分页结果类型
 */
@ObjectType('ReservationList')
export class ReservationListType {
  @Field(() => [ReservationType])
  data: ReservationType[];

  @Field(() => PageInfoType)
  pageInfo: PageInfoType;
}

// ============================================
// Input Types
// ============================================

/**
 * 创建预订输入
 */
@InputType()
export class CreateReservationInput {
  @Field()
  @IsString()
  @MaxLength(50)
  customerName: string;

  @Field()
  @IsString()
  customerPhone: string;

  @Field({ nullable: true })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @Field()
  @IsDateString()
  reservationDate: string;

  @Field()
  @IsString()
  storeId: string;

  @Field()
  @IsString()
  storeName: string;

  @Field()
  @IsString()
  timeSlot: string;

  @Field()
  @IsString()
  timeSlotName: string;

  @Field()
  @IsString()
  tableConfigId: string;

  @Field()
  @IsString()
  tableConfigName: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  specialRequests?: string;

  @Field({ nullable: true, description: '预计到达时间 (HH:mm 格式，如: 18:30)' })
  @IsString()
  @IsOptional()
  @MaxLength(5)
  estimatedArrivalTime?: string;
}

/**
 * 更新预订状态输入
 */
@InputType()
export class UpdateReservationStatusInput {
  @Field()
  @IsString()
  reservationId: string;

  @Field(() => ReservationStatus)
  @IsEnum(ReservationStatus)
  status: ReservationStatus;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  reason?: string;
}

/**
 * 更新预订输入
 */
@InputType()
export class UpdateReservationInput {
  @Field()
  @IsString()
  reservationId: string;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  reservationDate?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  storeId?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  storeName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  timeSlot?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  timeSlotName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  tableConfigId?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  tableConfigName?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  specialRequests?: string;

  @Field({ nullable: true, description: '预计到达时间 (HH:mm 格式，如: 18:30)' })
  @IsString()
  @IsOptional()
  @MaxLength(5)
  estimatedArrivalTime?: string;
}

/**
 * 预订查询输入
 */
@InputType()
export class ReservationQueryInput {
  @Field(() => [ReservationStatus], { nullable: true })
  @IsEnum(ReservationStatus, { each: true })
  @IsOptional()
  status?: ReservationStatus[];

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  userId?: string;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  timeSlot?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  tableSize?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  source?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  storeId?: string;
}
