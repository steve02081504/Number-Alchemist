# Number Alchemist

[![npm version](https://img.shields.io/npm/v/@steve02081504/number-alchemist)](https://www.npmjs.com/package/@steve02081504/number-alchemist)
[![license](https://img.shields.io/github/license/steve02081504/Number-Alchemist)](./LICENSE)

**用基数的数字，构造并论证任意目标数的算术表达式。**

> 例如，以 `114514` 为基数，将任意整数表示为仅由 `1`、`1`、`4`、`5`、`1`、`4` 这些数字通过加减乘除幂运算组合而成的式子。

## 在线演示

[数字论证器](https://steve02081504.github.io/Number-Alchemist/) — 在浏览器中直接体验。

## 安装

作为库使用：

```bash
npm install @steve02081504/number-alchemist @steve02081504/bigfloat
```

全局安装 CLI：

```bash
npm install -g @steve02081504/number-alchemist @steve02081504/bigfloat
```

或直接通过 `npx` 免安装使用。

## CLI 用法

```
number-alchemist <base> <target> [--depth <n>]

  base    基数，其各位数字将用于构造表达式
  target  目标数（支持算术表达式，如 "1000-7"）
  --depth 最大搜索深度（默认不限）
```

```bash
$ npx number-alchemist 114514 1000
1000 = (((11-4)*5)+1+4)*(11+4+5+1+4)

$ npx number-alchemist 114514 1919810
1919810 = -(((((1+1)^4*5)+1+4)*(((11+4+5)-1)+4)*(((114+5+1)*4*(((1-1)*4*5-1)%4)+((1*1-4)*5)*1+4)*((11^4%5+1)%4))))
```

## API 快速上手

```js
import { expression_dictionary_t } from '@steve02081504/number-alchemist';

// 以 114514 为基数创建字典
const dict = expression_dictionary_t(114514);

// 证明目标数可由基数的数字表达
const expr = await dict.prove(1000);
console.log(`1000 = ${expr}`);
// 输出：1000 = (((11-4)*5)+1+4)*(11+4+5+1+4)

// 实时进度回调
await dict.prove(1919810, {
  onProgress: (node) => process.stderr.write(`\r${node}`),
});
```

## 核心概念

`expression_dictionary_t` 以一个整数字符串作为「基数」，自动枚举该数字的各位数字所能组合出的所有子表达式，形成一个内部字典，随后通过递归搜索将任意目标数表达为字典中已有值的四则运算与幂运算组合。

## API

### `expression_dictionary_t(numStr)`

创建表达式字典实例，参数为基数字符串（非数字字符会被自动过滤）。

等价于 `new expression_dictionary_t(numStr)`。

#### `dict.prove(num, options?): Promise<string>`

简写：`dict(num, options?)`。

证明 `num` 可由基数表示，返回对应的算术表达式字符串。

| 参数                 | 类型                     | 默认值     | 说明                   |
| -------------------- | ------------------------ | ---------- | ---------------------- |
| `num`                | `number \| bigfloat`     | —          | 目标数                 |
| `options.max_depth`  | `number`                 | `Infinity` | 最大搜索深度           |
| `options.onProgress` | `(expr: string) => void` | `() => {}` | 每次找到更优解时的回调 |

若无法在指定深度内找到表达式，则抛出 `Error`。

#### `dict.proveAst(num, options?): Promise<ast_node_t>`

与 `prove` 相同，但返回 AST 节点而非字符串。

#### `dict.getAst(num): ast_node_t | undefined`

从字典缓存中直接获取 `num` 对应的 AST 节点。

### 底层导出

```js
import {
  ast_node_t,
  operator_node_t,
  number_node_t,
  precedence_t,
  add,
  mergeDictionary,
  serializeMap,
  deserializeMap,
} from '@steve02081504/number-alchemist';
import { generateRecursive } from '@steve02081504/number-alchemist/generator';
```

## 运行测试

```bash
npm test
```

测试会随机抽取数百个整数，验证每一个生成的表达式求值结果与目标数一致。
