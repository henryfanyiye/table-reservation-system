import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

/**
 * GraphQL JSON 标量类型
 * 用于处理任意 JSON 数据
 */
@Scalar('JSON', (type) => type)
export class JSONScalar implements CustomScalar<any, any> {
  description = 'JSON custom scalar type';

  parseValue(value: any): any {
    return value;
  }

  serialize(value: any): any {
    return value;
  }

  parseLiteral(ast: ValueNode): any {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.LIST:
        return ast.values.map((v) => this.parseLiteral(v));
      case Kind.OBJECT:
        return ast.fields.reduce((acc, field) => {
          acc[field.name.value] = this.parseLiteral(field.value);
          return acc;
        }, {} as Record<string, unknown>);
      case Kind.NULL:
        return null;
      default:
        return null;
    }
  }
}

// 导出为 GraphQLJSONObject 以便在其他地方使用
export const GraphQLJSONObject = JSONScalar;
