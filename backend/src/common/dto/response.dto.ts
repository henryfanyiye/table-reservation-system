import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from '@common/graphql/scalars/json.scalar';

/**
 * 统一响应 DTO 基础类
 *
 * 所有 API 响应的通用格式
 */
@ObjectType('BaseResponse')
export class BaseResponseDto {
  @Field(() => Boolean, { description: '是否成功', defaultValue: true })
  success: boolean = true;

  @Field(() => String, { description: '响应消息', defaultValue: '操作成功' })
  message: string = 'Success';

  @Field(() => String, { description: '响应代码', defaultValue: '200' })
  code: string = '200';
}

/**
 * 带数据的响应 DTO（通用）
 */
@ObjectType('DataResponse')
export class DataResponseDto extends BaseResponseDto {
  @Field(() => GraphQLJSONObject, { description: '响应数据', nullable: true })
  data?: any;
}
