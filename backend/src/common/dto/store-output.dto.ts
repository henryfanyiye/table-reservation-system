import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * 预订规则输出类型
 */
@ObjectType('BookingRules')
export class BookingRulesOutput {
  @Field({ nullable: true })
  minDaysAdvance?: number;

  @Field({ nullable: true })
  maxDaysAdvance?: number;
}

/**
 * 桌型配置输出类型
 */
@ObjectType('TableConfig')
export class TableConfigOutput {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  seats: number;

  @Field()
  count: number;
}

/**
 * 时段配置输出类型
 */
@ObjectType('TimeSlotConfig')
export class TimeSlotConfigOutput {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  startTime: string;

  @Field()
  endTime: string;

  @Field()
  enabled: boolean;
}

/**
 * 门店配置输出类型
 */
@ObjectType('Store')
export class StoreOutput {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [TableConfigOutput], { nullable: true })
  tableConfig?: TableConfigOutput[];

  @Field(() => [TimeSlotConfigOutput], { nullable: true })
  timeSlotConfig?: TimeSlotConfigOutput[];

  @Field(() => BookingRulesOutput, { nullable: true })
  bookingRules?: BookingRulesOutput;

  @Field(() => String, { nullable: true })
  createdAt?: string | null;

  @Field(() => String, { nullable: true })
  updatedAt?: string | null;
}
