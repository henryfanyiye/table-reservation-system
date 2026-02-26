import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 桌型配置输入
 */
@InputType()
export class TableConfigInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  id?: string;

  @Field()
  @IsString()
  name: string;

  @Field()
  @IsNumber()
  seats: number;

  @Field()
  @IsNumber()
  count: number;
}

/**
 * 时段配置输入
 */
@InputType()
export class TimeSlotConfigInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  id?: string;

  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  startTime: string;

  @Field()
  @IsString()
  endTime: string;

  @Field()
  @IsBoolean()
  enabled: boolean;
}

/**
 * 预订规则输入
 */
@InputType()
export class BookingRulesInput {
  @Field({ nullable: true })
  @IsNumber()
  @IsOptional()
  minDaysAdvance?: number;

  @Field({ nullable: true })
  @IsNumber()
  @IsOptional()
  maxDaysAdvance?: number;
}

/**
 * 创建门店 DTO
 */
@InputType()
export class CreateStoreInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  address: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => [TableConfigInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableConfigInput)
  @IsOptional()
  tableConfig?: TableConfigInput[];

  @Field(() => [TimeSlotConfigInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotConfigInput)
  @IsOptional()
  timeSlotConfig?: TimeSlotConfigInput[];

  @Field(() => BookingRulesInput, { nullable: true })
  @IsObject()
  @ValidateNested()
  @Type(() => BookingRulesInput)
  @IsOptional()
  bookingRules?: BookingRulesInput;
}

/**
 * 更新门店配置 DTO
 */
@InputType()
export class UpdateStoreConfigInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  address?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field(() => [TableConfigInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableConfigInput)
  @IsOptional()
  tableConfig?: TableConfigInput[];

  @Field(() => [TimeSlotConfigInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotConfigInput)
  @IsOptional()
  timeSlotConfig?: TimeSlotConfigInput[];

  @Field(() => BookingRulesInput, { nullable: true })
  @IsObject()
  @ValidateNested()
  @Type(() => BookingRulesInput)
  @IsOptional()
  bookingRules?: BookingRulesInput;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;
}
