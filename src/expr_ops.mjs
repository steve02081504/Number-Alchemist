import { bigfloat } from '@steve02081504/bigfloat'

/** @enum {number} */
export const precedence_t = {
	[undefined]: 0,
	'u-': 4,
	'^': 3,
	'*': 2,
	'/': 2,
	'%': 2,
	'+': 1,
	'-': 1,
}

/** @typedef {{ t: 'n', v: string }} Lit */
/** @typedef {{ t: 'u', c: Expr }} Neg */
/** @typedef {{ t: 'b', op: string, l: Expr, r: Expr }} Bin */
/** @typedef {Lit | Neg | Bin} Expr */

function isNeg(e) {
	return e.t === 'u'
}

function negInner(e) {
	return isNeg(e) ? e.c : e
}

/**
 * @param {Expr} e
 * @returns {import('@steve02081504/bigfloat').bigfloat}
 */
function evalExpr(e) {
	if (e.t === 'n') return bigfloat(e.v)
	if (e.t === 'u') return evalExpr(e.c).neg()
	const { op, l, r } = e
	const a = evalExpr(l)
	const b = evalExpr(r)
	switch (op) {
		case '+': return a.add(b)
		case '-': return a.sub(b)
		case '*': return a.mul(b)
		case '/': return a.div(b)
		case '%': return a.mod(b)
		case '^': return a.pow(b)
		default: throw new Error(`eval ${op}`)
	}
}

/**
 * @param {string} s
 * @returns {Expr}
 */
export function parseExpr(s) {
	const toks = []
	for (let i = 0; i < s.length; i++) {
		const c = s[i]
		if (c === ' ' || c === '\t') continue
		if ('+-*/%^()'.includes(c)) toks.push(c)
		else if (c >= '0' && c <= '9') {
			let j = i
			while (j < s.length && s[j] >= '0' && s[j] <= '9') j++
			toks.push(s.slice(i, j))
			i = j - 1
		}
		else throw new Error(`parseExpr: bad char ${c}`)
	}
	let p = 0
	const peek = () => toks[p]
	const eat = () => toks[p++]

	function parseAdd() {
		let x = parseMul()
		while (peek() === '+' || peek() === '-') {
			const op = eat()
			const y = parseMul()
			x = normalizeBin(op, x, y)
		}
		return x
	}
	function parseMul() {
		let x = parsePow()
		while (peek() === '*' || peek() === '/' || peek() === '%') {
			const op = eat()
			const y = parsePow()
			x = normalizeBin(op, x, y)
		}
		return x
	}
	function parsePow() {
		let x = parseUnary()
		while (peek() === '^') {
			eat()
			const y = parseUnary()
			x = normalizePow(x, y, evalExpr(y))
		}
		return x
	}
	function parseUnary() {
		if (peek() === '-') {
			eat()
			return normalizeUnary(parseUnary())
		}
		return parsePrimary()
	}
	function parsePrimary() {
		const t = peek()
		if (t === '(') {
			eat()
			const e = parseAdd()
			if (eat() !== ')') throw new Error('expected )')
			return e
		}
		if (typeof t === 'string' && /^[0-9]+$/.test(t)) {
			eat()
			return { t: 'n', v: t }
		}
		throw new Error(`parsePrimary at ${t}`)
	}
	return parseAdd()
}

/**
 * @param {Expr} e
 * @returns {Expr}
 */
function normalizeUnary(e) {
	if (e.t === 'u') return e.c
	return { t: 'u', c: e }
}

/**
 * @param {Expr} l
 * @param {Expr} r
 * @param {import('@steve02081504/bigfloat').bigfloat} keyExp
 */
function normalizePow(l, r, keyExp) {
	const left_abs = negInner(l)
	const left_is_negative = isNeg(l)
	if (keyExp.sign) throw new RangeError('negative exponent')
	if (left_is_negative && keyExp.floor().equals(keyExp)) {
		const expAbs = keyExp.abs().floor()
		const even = expAbs % 2n === 0n
		if (even) return { t: 'b', op: '^', l: left_abs, r }
		return normalizeUnary({ t: 'b', op: '^', l: left_abs, r })
	}
	return { t: 'b', op: '^', l, r }
}

/**
 * @param {string} op
 * @param {Expr} l
 * @param {Expr} r
 * @returns {Expr}
 */
function normalizeBin(op, l, r) {
	if (op === '^') throw new Error('use normalizePow')
	if (op === 'u-') throw new Error('use normalizeUnary')

	if (op === '+' && r.t === 'u') {
		return normalizeBin('-', l, r.c)
	}
	if (op === '-' && r.t === 'u') {
		return normalizeBin('+', l, r.c)
	}

	const left_abs = negInner(l)
	const right_abs = negInner(r)
	const left_is_negative = isNeg(l)
	const right_is_negative = isNeg(r)

	if (op === '*' || op === '/') {
		if (left_is_negative && right_is_negative)
			return { t: 'b', op, l: left_abs, r: right_abs }
		if (left_is_negative || right_is_negative)
			return normalizeUnary({ t: 'b', op, l: left_abs, r: right_abs })
	}
	return { t: 'b', op, l, r }
}

/**
 * @param {string} op
 * @param {string} leftStr
 * @param {string} rightStr
 * @param {import('@steve02081504/bigfloat').bigfloat} [keyRight] for ^ exponent value
 */
export function combine(op, leftStr, rightStr, keyRight) {
	const l = parseExpr(leftStr)
	const r = parseExpr(rightStr)
	if (op === '^') {
		if (!keyRight) keyRight = evalExpr(r)
		return stringify(normalizePow(l, r, keyRight))
	}
	return stringify(normalizeBin(op, l, r))
}

/**
 * @param {string} inner
 */
export function combineUnaryNeg(inner) {
	return stringify(normalizeUnary(parseExpr(inner)))
}

function operandOp(e) {
	return e.t === 'u' ? 'u-' : e.op
}

/**
 * @param {Expr} operand
 * @param {Expr} parent
 * @param {boolean} is_left
 */
function formatOperand(operand, parent, is_left) {
	if (operand.t === 'n') return operand.v

	const parentOp = parent.t === 'u' ? 'u-' : parent.op
	const op = operandOp(operand)

	if (operand.t === 'b') {
		if (parentOp === op) {
			if ((parentOp === '-' || parentOp === '/') && !is_left)
				return `(${stringify(operand)})`
			if ((parentOp === '-' || parentOp === '/') && is_left)
				return stringify(operand)
			if (parentOp === '+' || parentOp === '^')
				return stringify(operand)
			if (parentOp === '*') {
				const isCleanLeftPath = (node, o) => {
					if (node.t !== 'b') return true
					if (node.op !== o) return false
					return isCleanLeftPath(node.l, o)
				}
				return is_left || isCleanLeftPath(operand, '*') ? stringify(operand) : `(${stringify(operand)})`
			}
			if (parentOp === 'u-')
				return `(${stringify(operand)})`
		}
		if (precedence_t[parentOp] === precedence_t[op])
			return is_left ? stringify(operand) : `(${stringify(operand)})`
		if (parentOp === '^' && op === 'u-')
			return `(${stringify(operand)})`
		if (precedence_t[op] < precedence_t[parentOp])
			return `(${stringify(operand)})`
		return stringify(operand)
	}

	// operand.t === 'u'
	if (parentOp === op) {
		if ((parentOp === '-' || parentOp === '/') && !is_left)
			return `(${stringify(operand)})`
		if ((parentOp === '-' || parentOp === '/') && is_left)
			return stringify(operand)
		if (parentOp === '+' || parentOp === '^')
			return stringify(operand)
		if (parentOp === '*') {
			const isCleanLeftPath = (node, o) => {
				if (node.t !== 'b') return true
				if (node.op !== o) return false
				return isCleanLeftPath(node.l, o)
			}
			return is_left || isCleanLeftPath(operand, '*') ? stringify(operand) : `(${stringify(operand)})`
		}
		if (parentOp === 'u-')
			return `(${stringify(operand)})`
	}
	if (precedence_t[parentOp] === precedence_t[op])
		return is_left ? stringify(operand) : `(${stringify(operand)})`
	if (parentOp === '^' && op === 'u-')
		return `(${stringify(operand)})`
	if (precedence_t[op] < precedence_t[parentOp])
		return `(${stringify(operand)})`
	return stringify(operand)
}

/**
 * @param {Expr} e
 * @returns {string}
 */
export function stringify(e) {
	if (e.t === 'n') return e.v
	if (e.t === 'u')
		return `-${formatOperand(e.c, e, false)}`
	const { op, l, r } = e
	const left_str = formatOperand(l, e, true)
	const right_str = formatOperand(r, e, false)
	return `${left_str}${op}${right_str}`
}

/**
 * @param {Map<string, string>} dict
 * @param {import('@steve02081504/bigfloat').bigfloat|string} key
 * @param {string} value
 */
export function add(dict, key, value) {
	key = String(key)
	if (!dict.has(key))
		dict.set(key, value)
	else if (dict.get(key).length > value.length)
		dict.set(key, value)
}

/**
 * @param {Map<string, string>} dict_1
 * @param {Map<string, string>} dict_2
 * @param {import('@steve02081504/bigfloat').bigfloat} max_value
 */
export function mergeDictionary(dict_1, dict_2, max_value) {
	const result = new Map()
	const max_value_str = String(max_value)

	for (const [key_str1, val1] of dict_1) {
		const key1 = bigfloat(key_str1)
		for (const [key_str2, val2] of dict_2) {
			const key2 = bigfloat(key_str2)

			add(result, key1.add(key2), combine('+', val1, val2))
			add(result, key1.mul(key2), combine('*', val1, val2))
			if (!key2.equals(0)) {
				add(result, key1.sub(key2), combine('-', val1, val2))
				const mod = key1.mod(key2)
				add(result, mod, combine('%', val1, val2))
				if (mod.equals(0))
					add(result, key1.div(key2), combine('/', val1, val2))
			}
			try {
				if (
					key1.abs().greaterThan(max_value_str.length) ||
					key2.abs().greaterThan(max_value_str.length)
				)
					continue
				add(result, key1.pow(key2), combine('^', val1, val2, key2))
			}
			catch { }
		}
	}
	return result
}

/** @param {Map<string, string>} map */
export function serializeMap(map) {
	return Array.from(map.entries())
}

/** @param {Array<[string, string]>} arr */
export function deserializeMap(arr) {
	return new Map(arr)
}
