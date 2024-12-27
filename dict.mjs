import { bigfloat } from './bigfloat.mjs'
import {
	operator_node_t,
	add,
	ast_node_t,
	number_node_t,
	mergeDictionary,
} from './dict_ast.mjs'
import { generateRecursive } from './dict_geneator.mjs'

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
		{
			num_str = String(num_str).replace(/\D/g, '')
			const max_value = num_str.repeat(2)

			let result = generateRecursive(num_str, max_value)

			let self_dict = new Map()
			self_dict.set(num_str, new number_node_t(num_str))
			self_dict = mergeDictionary(self_dict, self_dict, max_value)

			this.data = new Map([...self_dict, ...result])
		}
		return new Proxy(this, {
			apply: (target, thisArg, args) => this.prove(...args)
		})
	}

	/**
	 * 获取字典中所有数字键的数组。
	 * @returns {bigfloat[]} 数字键数组。
	 */
	getKeys() {
		return Array.from(this.data.keys()).map(bigfloat)
	}

	/**
	 * 证明给定数字可以由当前字典的子项运算结果表达。
	 * @param {bigfloat} num 要证明的数字。
	 * @param {number} [max_depth=Infinity] 最大搜索深度。
	 * @returns {ast_node_t} 证明数字存在的 AST 节点。
	 * @throws {Error} 如果无法证明数字的存在。
	 */
	proveAst(num, max_depth = Infinity) {
		num = bigfloat(num)
		const num_str = String(num)

		// 如果字典中已存在该数字，直接返回对应的 AST 节点
		if (this.data.has(num_str)) return this.data.get(num_str)

		// 处理非整数情况
		if (!num.floor().equals(num)) {
			const numerator_proof = this.proveAst(num.basenum.numerator, max_depth - 1)
			const denominator_proof = this.proveAst(num.basenum.denominator, max_depth - 1)
			const result = new operator_node_t('/', [numerator_proof, denominator_proof])
			return result
		}

		// 限制搜索深度
		if (max_depth <= 0)
			throw new Error(`无法在指定深度内证明 ${num} 的存在`)

		// 从大到小排序键值，优化搜索顺序
		const sorted_keys = this.getKeys().sort((a, b) => b.compare(a))

		// 优化搜索策略：除法 -> 乘法 -> 取模 -> 减法 -> 加法
		for (const key of sorted_keys)
			// 尝试除法
			try {
				if (key.isInf() || key.equals(0)) continue
				let product = num
				let times = 0n
				while (true) {
					let new_product = product.div(key)
					if (!new_product.lessThan(product)) break
					if (new_product.floor().equals(new_product)) {
						product = new_product
						times++
					} else
						break

				}

				if (times > 0) {
					const key_str = key.toString()
					const times_proof = this.proveAst(bigfloat(times), max_depth - 1)
					const product_proof = this.proveAst(product, max_depth - 1)
					const result = new operator_node_t('*', [
						times > 1 ? new operator_node_t('^', [this.data.get(key_str), times_proof]) : this.data.get(key_str),
						product_proof,
					])
					add(this.data, num, result)
					return result
				}
			} catch (e) {
				// 忽略除法错误
			}
		for (const key of sorted_keys)
			// 尝试乘法
			try {
				if (key.isInf() || key.equals(0)) continue
				const product = num.mul(key)
				const product_str = product.toString()
				if (this.data.has(product_str)) {
					const result = new operator_node_t('/', [this.data.get(product_str), this.data.get(key.toString())])
					add(this.data, num, result)
					return result
				}
			} catch (e) {
				// 忽略乘法错误
			}
		for (const key of sorted_keys)
			// 尝试取模
			try {
				if (key.isInf() || key.equals(0)) continue
				const mod_result = num.mod(key)
				if (mod_result.abs().lessThan(num.abs())) {
					const quotient = num.div(key).floor()
					const quotient_proof = this.proveAst(quotient, max_depth - 1)
					const mod_result_proof = this.proveAst(mod_result, max_depth - 1)

					const result = new operator_node_t('+', [
						new operator_node_t('*', [this.data.get(key.toString()), quotient_proof]),
						mod_result_proof,
					])
					add(this.data, num, result)
					return result
				}
			} catch (e) {
				// 忽略取模错误
			}
		for (const key of sorted_keys)
			// 尝试减法
			try {
				const diff = num.sub(key)
				if (diff.abs().lessThan(num.abs())) {
					const diff_proof = this.proveAst(diff, max_depth - 1)
					const result = new operator_node_t('+', [
						this.data.get(key.toString()),
						diff_proof,
					])
					add(this.data, num, result)
					return result
				}
			} catch (e) {
				// 忽略减法错误
			}
		for (const key of sorted_keys)
			// 尝试加法
			try {
				const sum = num.add(key)
				const sum_str = sum.toString()
				if (this.data.has(sum_str) || sum.abs().lessThan(num.abs())) {
					const sum_proof = this.proveAst(sum, max_depth - 1)
					const result = new operator_node_t('-', [
						sum_proof,
						this.data.get(key.toString()),
					])
					add(this.data, num, result)
					return result
				}
			} catch (e) {
				// 忽略加法错误
			}

		throw new Error(`无法证明 ${num} 的存在`)
	}

	/**
	 * 证明给定数字可以由当前字典的子项运算结果表达。
	 * @param {bigfloat} num 要证明的数字。
	 * @param {number} [max_depth=Infinity] 最大搜索深度。
	 * @returns {string} 证明数字存在的表达式字符串。
	 * @throws {Error} 如果无法证明数字的存在。
	 */
	prove(num, max_depth = Infinity) {
		return this.proveAst(num, max_depth).toString()
	}

	/**
	 * 获取表达式的计算步骤，用于调试。
	 * @param {ast_node_t} node 表达式 AST 节点。
	 * @returns {string} 分解后的计算步骤。
	 */
	getCalculationSteps(node) {
		return node.getCalculationSteps().steps
	}

	/**
	 * 测试函数。
	 * @param {bigfloat} num 要测试的数字。
	 * @returns {string} 证明数字存在的表达式。
	 * @throws {Error} 如果证明失败或计算结果不匹配。
	 */
	test(num) {
		let proof = this.prove(num, 17)
		let num_result = bigfloat.eval(proof.replaceAll('^', '**'))
		if (num_result.equals(num))
			return proof
		else {
			let ast = this.data.get(num.toString())
			console.log(ast.getCalculationSteps())
			let result2
			try {
				result2 = eval(proof.replaceAll('^', '**'))
			} catch (e) {
				console.log(`证明 ${num} 失败：${proof} -> ${num_result}`)
				throw e
			}
			if (num_result.equals(result2))
				throw new Error(`证明 ${num} 失败：${proof} -> ${num_result}`)
			else
				throw new Error(`bigfloat.eval 有问题，证明 ${num} 失败：${proof} -> ${num_result}(from bigfloat.eval) != ${result2}(from eval)`)
		}
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
