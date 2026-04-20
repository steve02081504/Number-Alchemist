# Number Alchemist

[![npm version](https://img.shields.io/npm/v/@steve02081504/number-alchemist)](https://www.npmjs.com/package/@steve02081504/number-alchemist)
[![license](https://img.shields.io/github/license/steve02081504/Number-Alchemist)](./LICENSE)

**Construct and prove arithmetic expressions for any target number using only the digits of a base number.**

> For example, given `114514` as the base, any integer can be expressed using only the digits `1`, `1`, `4`, `5`, `1`, `4` — combined via addition, subtraction, multiplication, division, and exponentiation.

## Live Demo

[Number Alchemist](https://steve02081504.github.io/Number-Alchemist/) — try it directly in your browser.

## Installation

As a library:

```bash
npm install @steve02081504/number-alchemist @steve02081504/bigfloat
```

As a global CLI tool:

```bash
npm install -g @steve02081504/number-alchemist @steve02081504/bigfloat
```

Or run it instantly without installing via `npx`.

## CLI Usage

```
number-alchemist <base> <target> [--depth <n>]

  base    The base number whose digits are used to build expressions
  target  The target number (arithmetic expressions like "1000-7" are supported)
  --depth Maximum search depth (unlimited by default)
```

```bash
$ npx number-alchemist 114514 1000
1000 = (((11-4)*5)+1+4)*(11+4+5+1+4)

$ npx number-alchemist 114514 1919810
1919810 = -(((((1+1)^4*5)+1+4)*(((11+4+5)-1)+4)*(((114+5+1)*4*(((1-1)*4*5-1)%4)+((1*1-4)*5)*1+4)*((11^4%5+1)%4))))
```

## Quick Start

```js
import { expression_dictionary_t } from '@steve02081504/number-alchemist';

// Create a dictionary with 114514 as the base
const dict = expression_dictionary_t(114514);

// Prove that 1000 can be expressed using the digits of the base
const expr = await dict.prove(1000);
console.log(`1000 = ${expr}`);
// Output: 1000 = (((11-4)*5)+1+4)*(11+4+5+1+4)

// With a real-time progress callback
await dict.prove(1919810, {
  onProgress: (expr) => process.stderr.write(`\r${expr}`),
});
```

## How It Works

`expression_dictionary_t` takes an integer string as a **base**, then automatically enumerates all sub-expressions that can be formed by combining the individual digits of that number. These are stored in an internal dictionary. When asked to prove a target number, it performs a recursive search to express the target as a combination of dictionary values using arithmetic and exponentiation.

## API

### `expression_dictionary_t(numStr)`

Creates an expression dictionary instance. The argument is the base number as a string; non-digit characters are filtered out automatically.

Equivalent to `new expression_dictionary_t(numStr)`.

#### `dict.prove(num, options?): Promise<string>`

Shorthand: `dict(num, options?)`.

Proves that `num` can be expressed using the digits of the base, and returns the corresponding arithmetic expression as a string.

| Parameter            | Type                     | Default    | Description                                             |
| -------------------- | ------------------------ | ---------- | ------------------------------------------------------- |
| `num`                | `number \| bigfloat`     | —          | The target number to prove                              |
| `options.max_depth`  | `number`                 | `Infinity` | Maximum search depth                                    |
| `options.onProgress` | `(expr: string) => void` | `() => {}` | Callback invoked each time a better expression is found |

Throws an `Error` if no expression can be found within the specified depth.

#### `dict.getExpr(num): string | undefined`

Returns the cached symbolic expression string for `num` if it exists in the dictionary, without running a proof search.

### Low-level Exports

```js
import {
  precedence_t,
  add,
  mergeDictionary,
  combine,
  combineUnaryNeg,
  parseExpr,
  stringify,
  serializeMap,
  deserializeMap,
} from '@steve02081504/number-alchemist';
import { generateRecursive } from '@steve02081504/number-alchemist/generator';
```

## Running Tests

```bash
npm test
```

The test suite randomly samples hundreds of integers and verifies that every generated expression evaluates back to the correct target value.
