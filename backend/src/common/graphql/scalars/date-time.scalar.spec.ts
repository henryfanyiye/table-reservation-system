import { DateTimeScalar } from './date-time.scalar';
import { Kind } from 'graphql';

describe('DateTimeScalar', () => {
  let scalar: DateTimeScalar;

  beforeEach(() => {
    scalar = new DateTimeScalar();
  });

  describe('parseValue', () => {
    it('成功解析 ISO 8601 字符串为 Date 对象', () => {
      const dateString = '2024-06-15T12:30:00.000Z';
      const result = scalar.parseValue(dateString);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(dateString);
    });

    it('成功解析日期字符串为 Date 对象', () => {
      const dateString = '2024-06-15';
      const result = scalar.parseValue(dateString);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5); // 月份从 0 开始
      expect(result.getDate()).toBe(15);
    });

    it('处理带有时间的日期字符串（使用 UTC 时间）', () => {
      const dateString = '2024-12-25T18:30:45.123Z';
      const result = scalar.parseValue(dateString);

      expect(result).toBeInstanceOf(Date);
      // 使用 UTC 时间方法
      expect(result.getUTCHours()).toBe(18);
      expect(result.getUTCMinutes()).toBe(30);
      expect(result.getUTCSeconds()).toBe(45);
    });
  });

  describe('serialize', () => {
    it('成功将 Date 对象序列化为 ISO 8601 字符串', () => {
      const date = new Date('2024-06-15T12:30:00.000Z');
      const result = scalar.serialize(date);

      expect(result).toBe('2024-06-15T12:30:00.000Z');
    });

    it('处理当前时间的序列化', () => {
      const now = new Date();
      const result = scalar.serialize(now);

      expect(typeof result).toBe('string');
      expect(new Date(result)).toEqual(now);
    });

    it('处理非 Date 对象的值', () => {
      const stringValue = '2024-06-15T12:30:00.000Z';
      const result = scalar.serialize(stringValue as any);

      expect(result).toBe(stringValue);
    });
  });

  describe('parseLiteral', () => {
    it('成功解析 STRING 类型的 AST 节点', () => {
      const ast = {
        kind: Kind.STRING,
        value: '2024-06-15T12:30:00.000Z',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-06-15T12:30:00.000Z');
    });

    it('成功解析日期格式的 STRING 类型 AST 节点', () => {
      const ast = {
        kind: Kind.STRING,
        value: '2024-06-15',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
    });

    it('非 STRING 类型时抛出 TypeError', () => {
      const ast = {
        kind: Kind.INT,
        value: '123456',
      };

      expect(() => scalar.parseLiteral(ast)).toThrow(
        TypeError,
      );
      expect(() => scalar.parseLiteral(ast)).toThrow(
        'DateTime cannot represent non-string value',
      );
    });

    it('非 STRING 类型时抛出 TypeError（BOOLEAN 类型）', () => {
      const ast = {
        kind: Kind.BOOLEAN,
        value: true,
      };

      expect(() => scalar.parseLiteral(ast)).toThrow(
        TypeError,
      );
      expect(() => scalar.parseLiteral(ast)).toThrow(
        'DateTime cannot represent non-string value',
      );
    });

    it('非 STRING 类型时抛出 TypeError（FLOAT 类型）', () => {
      const ast = {
        kind: Kind.FLOAT,
        value: '12.34',
      };

      expect(() => scalar.parseLiteral(ast)).toThrow(
        TypeError,
      );
      expect(() => scalar.parseLiteral(ast)).toThrow(
        'DateTime cannot represent non-string value',
      );
    });
  });

  describe('description', () => {
    it('包含正确的描述信息', () => {
      expect(scalar.description).toBe(
        'A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format.',
      );
    });
  });

  describe('边界情况测试', () => {
    it('处理无效的日期字符串', () => {
      const invalidDate = 'invalid-date';
      const result = scalar.parseValue(invalidDate);

      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('处理空字符串', () => {
      const emptyString = '';
      const result = scalar.parseValue(emptyString);

      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('处理 Unix 时间戳字符串（ISO 格式）', () => {
      // Unix 时间戳需要转换为 ISO 格式才能被正确解析
      const timestamp = new Date(1718404200000).toISOString();
      const result = scalar.parseValue(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });

    it('处理数字类型的 Unix 时间戳', () => {
      const timestamp = 1718404200000;
      const result = scalar.parseValue(timestamp as any);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });
  });
});
