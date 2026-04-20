import { bigfloat } from '@steve02081504/bigfloat'
import {
	operator_node_t,
	add,
	number_node_t,
	mergeDictionary,
} from './dict_ast.mjs'
import { generateRecursive } from './dict_generator.mjs'

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
 * 表达式字典类，用于存储数字及其对应的表达式的 AST 表示。
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
			self_dict.set(num_str, new number_node_t(num_str))
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
	 * 获取字典中特定数字的 AST 节点。
	 * @param {bigfloat} num 要获取的数字。
	 * @returns {ast_node_t} 对应的 AST 节点。
	 */
	getAst(num) {
		const result = this.data.get(String(num))
		return result
	}

	/**
	 * 证明给定数字可以由当前字典的子项运算结果表达。
	 * @param {bigfloat} num 要证明的数字。
	 * @param {number} [max_depth=Infinity] 最大搜索深度。
	 * @param {(node: ast_node_t) => void} [onProgress] 每次证明更新时调用。
	 * @returns {Promise<ast_node_t>} 证明数字存在的 AST 节点。
	 * @throws {Error} 如果无法证明数字的存在。
	 */
	async proveAst(num, { max_depth = Infinity, onProgress } = {}) {
		num = bigfloat(num)
		const num_str = String(num)

		let result
		const use_result = async (node) => {
			if (!node) return
			if (num.floor().equals(num)) add(this.data, num_str, node)
			const prev = result
			result = this.getAst(num_str)
			if (result?.get_self?.() !== prev?.get_self?.()) await onProgress?.(result)
			return result
		}
		const next_level = {
			max_depth: max_depth - 1,
		}

		// 处理非整数情况
		if (!num.floor().equals(num)) {
			const numerator_proof = await this.proveAst(num.basenum.numerator, next_level)
			const denominator_proof = await this.proveAst(num.basenum.denominator, next_level)
			return use_result(new operator_node_t('/', [numerator_proof, denominator_proof]))
		}

		// 如果字典中已存在该数字或其负数，直接返回对应的 AST 节点
		{
			if (this.data.has(num_str)) return use_result(this.getAst(num_str))
			const neg_num_str = String(num.neg())
			if (this.data.has(neg_num_str)) return use_result(new operator_node_t('u-', [this.getAst(neg_num_str)]))
		}
		// 限制搜索深度
		if (max_depth <= 0)
			throw new Error(`无法在指定深度内证明 ${num} 的存在`)

		try {
			const factors = factorize(num)
			if (!factors[0].abs().equals(1) && !factors[1].abs().equals(1)) {
				const factor1_proof = await this.proveAst(factors[0], next_level)
				const factor2_proof = await this.proveAst(factors[1], next_level)
				await use_result(new operator_node_t('*', [factor1_proof, factor2_proof]))
			}
		} catch (e) { }
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
				} else break
			}
			if (times > 0) {
				const key_str = key.toString()
				const times_proof = await this.proveAst(bigfloat(times), next_level)
				const product_proof = await this.proveAst(product, next_level)
				await use_result(new operator_node_t('*', [
					times > 1 ? new operator_node_t('^', [this.getAst(key_str), times_proof]) : this.getAst(key_str),
					product_proof,
				]))
				if (Math.random() > 2 / 3) break
				else i -= Math.floor(Math.random() * (key_list.length - i))
			}
		} catch (e) { }
		for (const key of this.getKeys()) try {
			if (key.isInf() || key.equals(0)) continue
			const product = num.mul(key)
			const product_str = product.toString()
			if (this.data.has(product_str))
				await use_result(new operator_node_t('/', [this.getAst(product_str), this.getAst(key.toString())]))
		} catch (e) { }
		key_list = this.getKeys()
		for (let i = 0; i < key_list.length; i++) try {
			const key = key_list[i]
			if (key.isInf() || key.equals(0)) continue
			const mod_result = num.mod(key)
			if (mod_result.abs().lessThan(num.abs())) {
				const quotient = num.div(key).floor()
				const quotient_proof = await this.proveAst(quotient, next_level)
				const mod_result_proof = await this.proveAst(mod_result, next_level)
				await use_result(new operator_node_t('+', [
					new operator_node_t('*', [this.getAst(key.toString()), quotient_proof]),
					mod_result_proof,
				]))
				if (Math.random() > 2 / 3) break
				else i -= Math.floor(Math.random() * (key_list.length - i))
			}
		} catch (e) { }
		if (result) return result
		for (const key of this.getKeys()) try {
			const diff = num.sub(key)
			if (diff.abs().lessThan(num.abs())) {
				const diff_proof = await this.proveAst(diff, next_level)
				await use_result(new operator_node_t('+', [
					this.getAst(key.toString()),
					diff_proof,
				]))
			}
		} catch (e) { }
		if (result) return result
		for (const key of this.getKeys()) try {
			const sum = num.add(key)
			const sum_str = sum.toString()
			if (this.data.has(sum_str) || sum.abs().lessThan(num.abs())) {
				const sum_proof = await this.proveAst(sum, next_level)
				await use_result(new operator_node_t('-', [
					sum_proof,
					this.getAst(key.toString()),
				]))
			}
		} catch (e) { }

		if (result) return result
		throw new Error(`无法证明 ${num} 的存在`)
	}

	/**
	 * 证明给定数字可以由当前字典的子项运算结果表达。
	 * @param {bigfloat} num 要证明的数字。
	 * @param {number} [max_depth=Infinity] 最大搜索深度。
	 * @param {(node: string) => void} [onProgress] 每次证明更新时调用。
	 * @returns {Promise<string>} 证明数字存在的表达式。
	 * @throws {Error} 如果无法证明数字的存在。
	 */
	async prove(num, { max_depth = Infinity, onProgress } = {}) {
		return this.proveAst(num, { max_depth, onProgress }).then((node) => node.toString())
	}

	/**
	 * 获取表达式的计算步骤，用于调试。
	 * @param {ast_node_t} node 表达式 AST 节点。
	 * @returns {string} 分解后的计算步骤。
	 */
	getCalculationSteps(node) {
		return node.getCalculationSteps().steps
	}
}
class bad_expression_dictionary_t extends expression_dictionary_t {
	constructor() {
		super('1')
		this.proveAst = async _ => { throw 'wtf do ya wanna? :(' }
	}
}
/**
 * @type {expression_dictionary_t & {(number: number): expression_dictionary_t}}
 */
const expression_dictionary_t_proxy = new Proxy(expression_dictionary_t, {
	apply: (target, thisArg, args) => {
		return new expression_dictionary_t(...args)
	}
})
export { expression_dictionary_t_proxy as expression_dictionary_t }
