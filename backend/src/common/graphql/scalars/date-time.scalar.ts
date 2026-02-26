import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

/**
 * GraphQL DateTime 标量类型
 * 用于处理日期时间数据
 */
@Scalar('DateTime', (type) => Date)
export class DateTimeScalar implements CustomScalar<string, Date> {
  description = 'A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format.';

  parseValue(value: string): Date {
    return new Date(value);
  }

  serialize(value: Date): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new TypeError(`DateTime cannot represent non-string value: ${ast.kind}`);
  }
}
