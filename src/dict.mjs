import { bigfloat } from '@steve02081504/bigfloat'
import { add, mergeDictionary, combine, combineUnaryNeg } from './expr_ops.mjs'
import { generateRecursive } from './dict_generator.mjs'

/**
 * 去掉非数字字符后是否非空（命中缓存时的短路：直接返回缓存式）。
 * @param {string} expr
 */
function cacheDigitShortcut(expr) {
	return expr.replace(/\D/g, '').length > 0
}

/**
 * @param {string} expr
 * @param {RegExpMatchArray[]} matches
 */
async function expandLiteralsInExpr(that, expr, opts, matches) {
	let out = expr
	for (const m of matches) {
		const v = m[0]
		const repl = await that.prove(bigfloat(v), opts)
		out = out.slice(0, m.index) + `(${repl})` + out.slice(m.index + v.length)
	}
	return out
}

/**
 * 将一个整数分解成两个尽可能接近的因子，不能使用平方根运算。
 *
 * @param {bigfloat} num - 要分解的整数。
 * @returns {bigfloat[]} - 包含两个因子的数组。
 */
function factorize(num) {
	if (num.lessThan(0)) {
		const result = factorize(num.neg())
		return [result[1], result[0].neg()]
	}
	let factor1 = bigfloat(1)
	let factor2 = num

	for (let i = 2n; num.greaterThan(i * i); i++)
		if (num.mod(i).equals(0)) {
			factor1 = num.div(i)
			factor2 = i
		}

	return [factor1, factor2].map(bigfloat)
}

/**
 * 表达式字典类，用于存储数字及其对应的表达式字符串。
 * @class
 */
class expression_dictionary_t extends Function {
	/**
	 * @param {string} num_str 初始数字字符串。
	 */
	constructor(num_str) {
		super()
		num_str = String(num_str).replace(/\D/g, '')
		if (!num_str) return new bad_expression_dictionary_t()
		{
			const max_value = num_str.repeat(2)

			const result = generateRecursive(num_str, max_value)

			let self_dict = new Map()
			self_dict.set(num_str, num_str)
			self_dict = mergeDictionary(self_dict, self_dict, max_value)

			this.data = new Map([...self_dict, ...result])
		}
		return new Proxy(this, {
			apply: (target, thisArg, args) => Reflect.apply(this.prove, this, args),
		})
	}

	/**
	 * 获取字典中所有数字键的数组。
	 * @returns {bigfloat[]} 数字键数组。
	 */
	getKeys() {
		if (this.sortedKeys?.length !== this.data.size) delete this.sortedKeys
		return this.sortedKeys ??= Array.from(this.data.keys()).map(bigfloat).sort((a, b) => b.compare(a))
	}

	/**
	 * @param {bigfloat} num
	 * @returns {string | undefined}
	 */
	getExpr(num) {
		return this.data.get(String(num))
	}

	/**
	 * 确保 num 已在字典中有符号化表达式（必要时搜索并写入）。
	 * @param {bigfloat} num
	 * @param {{ max_depth?: number, onProgress?: (s: string) => void }} [opts]
	 */
	async ensureProven(num, { max_depth = Infinity, onProgress } = {}) {
		num = bigfloat(num)
		const num_str = String(num)

		let lastSym
		const use_result = async (symStr) => {
			if (!symStr) return
			if (num.floor().equals(num)) add(this.data, num_str, symStr)
			const prev = lastSym
			lastSym = this.data.get(num_str)
			if (lastSym !== prev) await onProgress?.(lastSym)
		}
		const next_level = { max_depth: max_depth - 1, onProgress }

		if (!num.floor().equals(num)) {
			const nStr = String(num.basenum.numerator)
			const dStr = String(num.basenum.denominator)
			await this.ensureProven(num.basenum.numerator, next_level)
			await this.ensureProven(num.basenum.denominator, next_level)
			return await use_result(combine('/', this.data.get(nStr), this.data.get(dStr)))
		}

		if (this.data.has(num_str)) {
			const ex = this.data.get(num_str)
			if (cacheDigitShortcut(ex)) return
			const matches = [...ex.matchAll(/\d+/g)].sort((a, b) => b.index - a.index)
			for (const m of matches)
				await this.ensureProven(bigfloat(m[0]), next_level)
			return
		}
		{
			const neg_num_str = String(num.neg())
			if (this.data.has(neg_num_str))
				return await use_result(combineUnaryNeg(this.data.get(neg_num_str)))
		}

		if (max_depth <= 0)
			throw new Error(`无法在指定深度内证明 ${num} 的存在`)

		try {
			const factors = factorize(num)
			if (!factors[0].abs().equals(1) && !factors[1].abs().equals(1)) {
				await this.ensureProven(factors[0], next_level)
				await this.ensureProven(factors[1], next_level)
				await use_result(combine('*', this.data.get(String(factors[0])), this.data.get(String(factors[1]))))
			}
		}
		catch (e) { }
		let key_list = this.getKeys()
		for (let i = 0; i < key_list.length; i++) try {
			const key = key_list[i]
			if (key.isInf() || key.equals(0)) continue
			let product = num
			let times = 0n
			while (true) {
				const new_product = product.div(key)
				if (!new_product.lessThan(product)) break
				if (new_product.floor().equals(new_product)) {
					product = new_product
					times++
				}
				else break
			}
			if (times > 0) {
				const key_str = key.toString()
				await this.ensureProven(bigfloat(times), next_level)
				await this.ensureProven(product, next_level)
				const timesSym = this.data.get(String(times))
				const productSym = this.data.get(String(product))
				const left = times > 1
					? combine('^', this.data.get(key_str), timesSym, bigfloat(times))
					: this.data.get(key_str)
				await use_result(combine('*', left, productSym))
				if (Math.random() > 2 / 3) break
				else i -= Math.floor(Math.random() * (key_list.length - i))
			}
		}
		catch (e) { }
		for (const key of this.getKeys()) try {
			if (key.isInf() || key.equals(0)) continue
			const product = num.mul(key)
			const product_str = product.toString()
			if (this.data.has(product_str)) {
				await use_result(combine('/', this.data.get(product_str), this.data.get(key.toString())))
			}
		}
		catch (e) { }
		key_list = this.getKeys()
		for (let i = 0; i < key_list.length; i++) try {
			const key = key_list[i]
			if (key.isInf() || key.equals(0)) continue
			const mod_result = num.mod(key)
			if (mod_result.abs().lessThan(num.abs())) {
				const quotient = num.div(key).floor()
				await this.ensureProven(quotient, next_level)
				await this.ensureProven(mod_result, next_level)
				await use_result(combine('+', combine('*', this.data.get(key.toString()), this.data.get(String(quotient))), this.data.get(String(mod_result))))
				if (Math.random() > 2 / 3) break
				else i -= Math.floor(Math.random() * (key_list.length - i))
			}
		}
		catch (e) { }
		if (this.data.has(num_str)) return
		for (const key of this.getKeys()) try {
			const diff = num.sub(key)
			if (diff.abs().lessThan(num.abs())) {
				await this.ensureProven(diff, next_level)
				await use_result(combine('+', this.data.get(key.toString()), this.data.get(String(diff))))
			}
		}
		catch (e) { }
		if (this.data.has(num_str)) return
		for (const key of this.getKeys()) try {
			const sum = num.add(key)
			const sum_str = sum.toString()
			if (this.data.has(sum_str) || sum.abs().lessThan(num.abs())) {
				await this.ensureProven(sum, next_level)
				await use_result(combine('-', this.data.get(sum_str), this.data.get(key.toString())))
			}
		}
		catch (e) { }

		if (this.data.has(num_str)) return
		throw new Error(`无法证明 ${num} 的存在`)
	}

	/**
	 * @param {string} num_str
	 * @param {{ max_depth?: number, onProgress?: (s: string) => void }} [opts]
	 */
	async materialize(num_str, opts) {
		const ex = this.data.get(num_str)
		if (!ex) throw new Error(`无表达式 ${num_str}`)
		if (cacheDigitShortcut(ex)) return ex
		const matches = [...ex.matchAll(/\d+/g)].sort((a, b) => b.index - a.index)
		return expandLiteralsInExpr(this, ex, opts, matches)
	}

	/**
	 * @param {bigfloat} num
	 * @param {{ max_depth?: number, onProgress?: (s: string) => void }} [opts]
	 * @returns {Promise<string>}
	 */
	async prove(num, opts) {
		num = bigfloat(num)
		await this.ensureProven(num, opts)
		return this.materialize(String(num), opts)
	}
}

class bad_expression_dictionary_t extends expression_dictionary_t {
	constructor() {
		super('1')
		this.prove = async () => { throw new Error('wtf do ya wanna? :(') }
	}
}

const expression_dictionary_t_proxy = new Proxy(expression_dictionary_t, {
	apply: (target, thisArg, args) => new expression_dictionary_t(...args),
})
export { expression_dictionary_t_proxy as expression_dictionary_t }
