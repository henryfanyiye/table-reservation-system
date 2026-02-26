import { JSONScalar } from './json.scalar';
import { Kind } from 'graphql';

describe('JSONScalar', () => {
  let scalar: JSONScalar;

  beforeEach(() => {
    scalar = new JSONScalar();
  });

  describe('parseValue', () => {
    it('直接返回输入的值', () => {
      const testValue = { key: 'value' };
      const result = scalar.parseValue(testValue);

      expect(result).toBe(testValue);
    });

    it('处理字符串值', () => {
      const testValue = 'test string';
      const result = scalar.parseValue(testValue);

      expect(result).toBe(testValue);
    });

    it('处理数字值', () => {
      const testValue = 42;
      const result = scalar.parseValue(testValue);

      expect(result).toBe(testValue);
    });

    it('处理布尔值', () => {
      const testValue = true;
      const result = scalar.parseValue(testValue);

      expect(result).toBe(testValue);
    });

    it('处理 null 值', () => {
      const testValue = null;
      const result = scalar.parseValue(testValue);

      expect(result).toBe(testValue);
    });

    it('处理数组值', () => {
      const testValue = [1, 2, 3];
      const result = scalar.parseValue(testValue);

      expect(result).toBe(testValue);
    });

    it('处理嵌套对象', () => {
      const testValue = {
        user: {
          name: '张三',
          age: 25,
          address: {
            city: '北京',
            district: '朝阳区',
          },
        },
      };
      const result = scalar.parseValue(testValue);

      expect(result).toBe(testValue);
    });
  });

  describe('serialize', () => {
    it('直接返回输入的值', () => {
      const testValue = { key: 'value' };
      const result = scalar.serialize(testValue);

      expect(result).toBe(testValue);
    });

    it('处理字符串值', () => {
      const testValue = 'test string';
      const result = scalar.serialize(testValue);

      expect(result).toBe(testValue);
    });

    it('处理数字值', () => {
      const testValue = 42;
      const result = scalar.serialize(testValue);

      expect(result).toBe(testValue);
    });

    it('处理布尔值', () => {
      const testValue = false;
      const result = scalar.serialize(testValue);

      expect(result).toBe(testValue);
    });

    it('处理 null 值', () => {
      const testValue = null;
      const result = scalar.serialize(testValue);

      expect(result).toBe(testValue);
    });

    it('处理数组值', () => {
      const testValue = [1, 2, 3];
      const result = scalar.serialize(testValue);

      expect(result).toBe(testValue);
    });

    it('处理嵌套对象', () => {
      const testValue = {
        config: {
          enabled: true,
          limit: 10,
        },
      };
      const result = scalar.serialize(testValue);

      expect(result).toBe(testValue);
    });
  });

  describe('parseLiteral - STRING 类型', () => {
    it('正确解析 STRING 类型的 AST 节点', () => {
      const ast = {
        kind: Kind.STRING,
        value: 'test string',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe('test string');
    });

    it('处理空字符串', () => {
      const ast = {
        kind: Kind.STRING,
        value: '',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe('');
    });
  });

  describe('parseLiteral - BOOLEAN 类型', () => {
    it('正确解析 BOOLEAN 类型的 AST 节点（true）', () => {
      const ast = {
        kind: Kind.BOOLEAN,
        value: true,
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe(true);
    });

    it('正确解析 BOOLEAN 类型的 AST 节点（false）', () => {
      const ast = {
        kind: Kind.BOOLEAN,
        value: false,
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe(false);
    });
  });

  describe('parseLiteral - INT 类型', () => {
    it('正确解析 INT 类型的 AST 节点', () => {
      const ast = {
        kind: Kind.INT,
        value: '42',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('正确解析负整数', () => {
      const ast = {
        kind: Kind.INT,
        value: '-100',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe(-100);
    });

    it('正确解析零', () => {
      const ast = {
        kind: Kind.INT,
        value: '0',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe(0);
    });
  });

  describe('parseLiteral - FLOAT 类型', () => {
    it('正确解析 FLOAT 类型的 AST 节点', () => {
      const ast = {
        kind: Kind.FLOAT,
        value: '3.14',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe(3.14);
    });

    it('正确解析负浮点数', () => {
      const ast = {
        kind: Kind.FLOAT,
        value: '-2.5',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe(-2.5);
    });

    it('正确解析科学计数法', () => {
      const ast = {
        kind: Kind.FLOAT,
        value: '1.5e10',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBe(15000000000);
    });
  });

  describe('parseLiteral - LIST 类型', () => {
    it('正确解析 LIST 类型的 AST 节点（字符串数组）', () => {
      const ast = {
        kind: Kind.LIST,
        values: [
          { kind: Kind.STRING, value: 'apple' },
          { kind: Kind.STRING, value: 'banana' },
          { kind: Kind.STRING, value: 'orange' },
        ],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual(['apple', 'banana', 'orange']);
    });

    it('正确解析 LIST 类型的 AST 节点（数字数组）', () => {
      const ast = {
        kind: Kind.LIST,
        values: [
          { kind: Kind.INT, value: '1' },
          { kind: Kind.INT, value: '2' },
          { kind: Kind.INT, value: '3' },
        ],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual([1, 2, 3]);
    });

    it('正确解析 LIST 类型的 AST 节点（混合类型）', () => {
      const ast = {
        kind: Kind.LIST,
        values: [
          { kind: Kind.STRING, value: 'name' },
          { kind: Kind.INT, value: '25' },
          { kind: Kind.BOOLEAN, value: true },
        ],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual(['name', 25, true]);
    });

    it('正确解析嵌套 LIST', () => {
      const ast = {
        kind: Kind.LIST,
        values: [
          {
            kind: Kind.LIST,
            values: [
              { kind: Kind.INT, value: '1' },
              { kind: Kind.INT, value: '2' },
            ],
          },
          {
            kind: Kind.LIST,
            values: [
              { kind: Kind.INT, value: '3' },
              { kind: Kind.INT, value: '4' },
            ],
          },
        ],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    it('正确解析空数组', () => {
      const ast = {
        kind: Kind.LIST,
        values: [],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual([]);
    });
  });

  describe('parseLiteral - OBJECT 类型', () => {
    it('正确解析 OBJECT 类型的 AST 节点', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [
          {
            name: { value: 'name' },
            value: { kind: Kind.STRING, value: '张三' },
          },
          {
            name: { value: 'age' },
            value: { kind: Kind.INT, value: '25' },
          },
          {
            name: { value: 'active' },
            value: { kind: Kind.BOOLEAN, value: true },
          },
        ],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual({
        name: '张三',
        age: 25,
        active: true,
      });
    });

    it('正确解析嵌套对象', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [
          {
            name: { value: 'user' },
            value: {
              kind: Kind.OBJECT,
              fields: [
                {
                  name: { value: 'name' },
                  value: { kind: Kind.STRING, value: '李四' },
                },
                {
                  name: { value: 'age' },
                  value: { kind: Kind.INT, value: '30' },
                },
              ],
            },
          },
          {
            name: { value: 'status' },
            value: { kind: Kind.STRING, value: 'active' },
          },
        ],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual({
        user: {
          name: '李四',
          age: 30,
        },
        status: 'active',
      });
    });

    it('正确解析包含数组的对象', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [
          {
            name: { value: 'items' },
            value: {
              kind: Kind.LIST,
              values: [
                { kind: Kind.STRING, value: 'apple' },
                { kind: Kind.STRING, value: 'banana' },
              ],
            },
          },
          {
            name: { value: 'count' },
            value: { kind: Kind.INT, value: '2' },
          },
        ],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual({
        items: ['apple', 'banana'],
        count: 2,
      });
    });

    it('正确解析空对象', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual({});
    });
  });

  describe('parseLiteral - NULL 类型', () => {
    it('正确解析 NULL 类型的 AST 节点', () => {
      const ast = {
        kind: Kind.NULL,
        value: null,
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBeNull();
    });
  });

  describe('parseLiteral - 未知类型', () => {
    it('未知类型返回 null', () => {
      const ast = {
        kind: 'VARIABLE' as any,
        value: 'unknown',
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toBeNull();
    });
  });

  describe('description', () => {
    it('包含正确的描述信息', () => {
      expect(scalar.description).toBe('JSON custom scalar type');
    });
  });

  describe('复杂场景测试', () => {
    it('正确解析包含所有类型的复杂对象', () => {
      const ast = {
        kind: Kind.OBJECT,
        fields: [
          {
            name: { value: 'stringField' },
            value: { kind: Kind.STRING, value: 'test' },
          },
          {
            name: { value: 'numberField' },
            value: { kind: Kind.FLOAT, value: '3.14' },
          },
          {
            name: { value: 'boolField' },
            value: { kind: Kind.BOOLEAN, value: true },
          },
          {
            name: { value: 'arrayField' },
            value: {
              kind: Kind.LIST,
              values: [
                { kind: Kind.INT, value: '1' },
                { kind: Kind.INT, value: '2' },
                { kind: Kind.INT, value: '3' },
              ],
            },
          },
          {
            name: { value: 'nullField' },
            value: { kind: Kind.NULL, value: null },
          },
          {
            name: { value: 'objectField' },
            value: {
              kind: Kind.OBJECT,
              fields: [
                {
                  name: { value: 'nested' },
                  value: { kind: Kind.STRING, value: 'value' },
                },
              ],
            },
          },
        ],
      };

      const result = scalar.parseLiteral(ast);

      expect(result).toEqual({
        stringField: 'test',
        numberField: 3.14,
        boolField: true,
        arrayField: [1, 2, 3],
        nullField: null,
        objectField: {
          nested: 'value',
        },
      });
    });
  });
});
