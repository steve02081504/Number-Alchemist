import { bigfloat } from './bigfloat.mjs'

/**
 * 运算符优先级枚举。
 * @enum {number}
 */
const precedence_t = {
	'u-': 4, // 一元负号
	'^': 3,
	'*': 2,
	'/': 2,
	'%': 2,
	'+': 1,
	'-': 1,
}

/**
 * 抽象语法树节点基类。
 * @class
 */
class ast_node_t {
	#string_data
	#calculation_steps
	#calculation_result

	/**
	 * 将 AST 节点转换为表达式字符串。
	 * 使用缓存避免重复计算。
	 * @returns {string} 节点对应的表达式字符串。
	 */
	toString(...args) {
		return this.#string_data ??= this.toStringImpl(...args)
	}

	/**
	 * 由子类实现的具体字符串转换逻辑。
	 * @returns {string} 节点对应的表达式字符串。
	 */
	toStringImpl() {
		throw new Error('Not implemented')
	}

	/**
	 * 获取节点对应的计算结果。
	 * 使用缓存避免重复计算。
	 * @returns {bigfloat} 节点对应的计算结果。
	 */
	calculate() {
		return this.#calculation_result ??= this.calculateImpl()
	}

	/**
	 * 由子类实现的具体计算逻辑。
	 * @returns {bigfloat} 节点对应的计算结果。
	 */
	calculateImpl() {
		throw new Error('Not implemented')
	}

	/**
	 * 获取节点的计算步骤。
	 * 使用缓存避免重复计算。
	 * @returns {{steps: string, value: bigfloat}} 包含计算步骤和结果的对象。
	 */
	getCalculationSteps() {
		return this.#calculation_steps ??= this.getCalculationStepsImpl()
	}

	/**
	 * 由子类实现的具体计算步骤逻辑。
	 * @returns {{steps: string, value: bigfloat}} 包含计算步骤和结果的对象。
	 */
	getCalculationStepsImpl() {
		throw new Error('Not implemented')
	}
}

/**
 * 数字节点类，表示 AST 中的数字。
 * @class
 * @extends ast_node_t
 */
class number_node_t extends ast_node_t {
	/**
	 * 构造函数。
	 * @param {string|number} value 数字节点的值。
	 */
	constructor(value) {
		super()
		/**
		 * 节点值。
		 * @type {string|number}
		 */
		this.value = value
	}

	/**
	 * 实现的字符串转换逻辑。
	 * @returns {string} 数字节点的字符串表示。
	 */
	toStringImpl() {
		return String(this.value)
	}

	/**
	 * 实现的计算逻辑。
	 * @returns {bigfloat} 数字节点的值。
	 */
	calculateImpl() {
		return bigfloat(this.value)
	}

	/**
	 * 实现的计算步骤逻辑。
	 * @returns {{steps: string, value: bigfloat}} 包含计算步骤和结果的对象。
	 */
	getCalculationStepsImpl() {
		return {
			steps: this.value.toString(),
			value: bigfloat(this.value),
		}
	}
}

/**
 * 运算符节点类，表示 AST 中的运算符。
 * @class
 * @extends ast_node_t
 */
class operator_node_t extends ast_node_t {
	/**
	 * 构造函数。
	 * @param {string} operator 运算符。
	 * @param {ast_node_t[]} children 子节点数组。
	 */
	constructor(operator, children) {
		super()
		/**
		 * 子节点数组。
		 * @type {ast_node_t[]}
		 */
		this.children = children
		/**
		 * 运算符。
		 * @type {string}
		 */
		this.operator = operator
	}

	/**
	 * 实现的字符串转换逻辑。
	 * @param {string} [parent_operator] 父节点的运算符。
	 * @returns {string} 运算符节点的字符串表示。
	 */
	toStringImpl(parent_operator) {
		const { operator, children } = this

		// 一元运算符
		if (operator === 'u-') {
			const operand_str = this.formatOperand(children[0], operator, false)
			return `-${operand_str}`
		}

		// 二元运算符
		const [left, right] = children
		const left_str = this.formatOperand(left, operator, true)
		const right_str = this.formatOperand(right, operator, false)

		const expression = `${left_str}${operator}${right_str}`

		// 根据优先级判断是否添加括号
		return this.shouldAddParenthesis(parent_operator, operator) ? `(${expression})` : expression
	}

	/**
	 * 格式化操作数，根据需要添加括号。
	 * @param {ast_node_t} operand 子操作数节点。
	 * @param {string} parent_operator 父运算符。
	 * @param {boolean} is_left 是否为左操作数。
	 * @returns {string} 格式化后的操作数字符串。
	 */
	formatOperand(operand, parent_operator, is_left) {
		if (!(operand instanceof operator_node_t))
			return operand.toString()

		const { operator } = operand

		// 同级运算符的结合性
		if (parent_operator === operator) {
			if ((parent_operator === '-' || parent_operator === '/') && !is_left)
				return `(${operand.toString(parent_operator)})`

			// 加法、乘法和幂运算满足结合律
			if (parent_operator === '+' || parent_operator === '*' || parent_operator === '^')
				return operand.toString(parent_operator)

			// 一元负号
			if (parent_operator === 'u-')
				return `(${operand.toString(parent_operator)})`

		}

		// 优先级相同但运算符不同
		if (precedence_t[parent_operator] === precedence_t[operator])
			return `(${operand.toString(parent_operator)})`

		// 不同级运算符的优先级
		if (this.shouldAddParenthesis(parent_operator, operator))
			return `(${operand.toString(parent_operator)})`

		return operand.toString(parent_operator)
	}

	/**
	 * 判断是否需要添加括号。
	 * @param {string} parent_operator 父运算符。
	 * @param {string} current_operator 当前运算符。
	 * @returns {boolean} 是否需要添加括号。
	 */
	shouldAddParenthesis(parent_operator, current_operator) {
		if (!parent_operator)
			return false

		return precedence_t[current_operator] < precedence_t[parent_operator]
	}

	/**
	 * 反转加减符号。
	 * @returns {operator_node_t} 符号反转后的新节点。
	 */
	invertSign() {
		let [operand1, operand2] = this.children
		operand1 = operand1?.invertSign?.() ?? operand1
		operand2 = operand2?.invertSign?.() ?? operand2
		if (this.operator === '+')
			return new operator_node_t('-', [operand1, operand2])
		else if (this.operator === '-')
			return new operator_node_t('+', [operand1, operand2])
		else
			return this
	}

	/**
	 * 反转乘除符号。
	 * @returns {operator_node_t} 乘除符号反转后的新节点。
	 */
	invertMulti() {
		let [operand1, operand2] = this.children
		operand1 = operand1?.invertMulti?.() ?? operand1
		operand2 = operand2?.invertMulti?.() ?? operand2
		if (this.operator === '*')
			return new operator_node_t('/', [operand1, operand2])
		else if (this.operator === '/')
			return new operator_node_t('*', [operand1, operand2])
		else
			return this
	}

	/**
	 * 实现的计算逻辑。
	 * @returns {bigfloat} 运算结果。
	 */
	calculateImpl() {
		const [operand1, operand2] = this.children
		switch (this.operator) {
			case '+':
				return operand1.calculate().add(operand2.calculate())
			case '-':
				return operand1.calculate().sub(operand2.calculate())
			case '*':
				return operand1.calculate().mul(operand2.calculate())
			case '/':
				return operand1.calculate().div(operand2.calculate())
			case '%':
				return operand1.calculate().mod(operand2.calculate())
			case '^':
				return operand1.calculate().pow(operand2.calculate())
			case 'u-':
				return operand1.calculate().neg()
			default:
				throw new Error(`Unknown operator: ${this.operator}`)
		}
	}

	/**
	 * 实现的计算步骤逻辑。
	 * @returns {{steps: string, value: bigfloat}} 包含计算步骤和结果的对象。
	 */
	getCalculationStepsImpl() {
		const [operand1, operand2] = this.children

		if (this.operator === 'u-') {
			const { steps: operand_steps, value: operand_value } = operand1.getCalculationSteps()
			const calculated_value = operand_value.neg()
			return {
				steps: `-(${operand_steps}) = ${calculated_value.toString()}`,
				value: calculated_value,
			}
		} else {
			const { steps: operand1_steps, value: operand1_value } = operand1.getCalculationSteps()
			const { steps: operand2_steps, value: operand2_value } = operand2.getCalculationSteps()
			const calculated_value = this.calculate()
			return {
				steps: `(${operand1_steps}) ${this.operator} (${operand2_steps}) = ${calculated_value.toString()}`,
				value: calculated_value,
			}
		}
	}
}

/**
 * 向字典中添加键值对。
 * @param {Map<string, ast_node_t>} dict 字典。
 * @param {bigfloat} key 键。
 * @param {ast_node_t} value 值（AST 节点）。
 */
function baseAdd(dict, key, value) {
	const key_str = String(key)
	if (!dict.has(key_str) || dict.get(key_str).toString().length > value.toString().length)
		dict.set(key_str, value)
}

/**
 * 向字典中添加键值对，同时考虑一元负号。
 * @param {Map<string, ast_node_t>} dict 字典。
 * @param {bigfloat} key 键。
 * @param {ast_node_t} value 值（AST 节点）。
 */
function add(dict, key, value) {
	baseAdd(dict, key, value)
	baseAdd(dict, key.neg(), new operator_node_t('u-', [value]))
}

/**
 * 合并两个字典，生成包含所有可能运算结果的新字典。
 * @param {Map<string, ast_node_t>} dict_1 第一个字典。
 * @param {Map<string, ast_node_t>} dict_2 第二个字典。
 * @param {bigfloat} max_value 最大值，用于剪枝。
 * @returns {Map<string, ast_node_t>} 合并后的字典。
 */
function mergeDictionary(dict_1, dict_2, max_value) {
	const result = new Map()
	const max_value_str = String(max_value)

	for (const [key_str1, val1] of dict_1) {
		const key1 = bigfloat(key_str1)
		for (const [key_str2, val2] of dict_2) {
			const key2 = bigfloat(key_str2)

			// 加法
			add(result, key1.add(key2), new operator_node_t('+', [val1, val2]))
			// 减法
			add(result, key1.sub(key2), new operator_node_t('-', [val1, val2]))
			// 乘法
			add(result, key1.mul(key2), new operator_node_t('*', [val1, val2]))
			// 取模
			try {
				add(result, key1.mod(key2), new operator_node_t('%', [val1, val2]))
				// 除法 (如果可以整除才添加)
				let div = key1.div(key2)
				if (div.floor().equals(div))
					add(result, div, new operator_node_t('/', [val1, val2]))
			} catch { } // 忽略除以 0 的错误
			// 幂运算，快速剪枝
			try {
				if (
					key1.abs().greaterThan(max_value_str.length) ||
					key2.abs().greaterThan(max_value_str.length)
				)
					continue

				add(result, key1.pow(key2), new operator_node_t('^', [val1, val2]))
			} catch { } // 忽略超出范围的错误
		}
	}

	return result
}

/**
 * 表达式字典类，用于存储数字及其对应的表达式的 AST 表示。
 * @class
 */
export class expression_dictionary_t {
	/**
	 * 内部存储的字典数据。
	 * @type {Map<string, ast_node_t>}
	 */
	data

	/**
	 * 构造函数。
	 * @param {string} [num_str] 初始数字字符串。
	 */
	constructor(num_str) {
		num_str = String(num_str).replace(/\D/g, '')
		let max_value = bigfloat(num_str.repeat(2))

		/**
		 * 递归生成数字的所有可能组合的字典，使用缓存避免重复计算。
		 * @param {string} n 数字字符串。
		 * @returns {Map<string, ast_node_t>} 包含数字 n 所有可能组合的字典。
		 */
		function generateRecursive(n) {
			let result = new Map()

			// 将数字拆分成左右两部分，递归生成子字典
			if (n.length != 1)
				for (let i = 1; i < n.length; i++) {
					const left = n.slice(0, i)
					const right = n.slice(i)
					if (!left || !right) continue

					result = mergeDictionary(generateRecursive(left), generateRecursive(right), max_value)
				}

			add(result, bigfloat(n), new number_node_t(n))
			return result
		}

		this.data = generateRecursive(num_str)
		add(this.data, bigfloat(num_str), new number_node_t(num_str))
		this.data = new Map([...mergeDictionary(this.data, this.data, max_value).entries(), ...this.data.entries()])
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
		const num_str = String(num)

		if (this.data.has(num_str))
			return this.data.get(num_str)

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

		const sorted_keys = this.getKeys().sort((a, b) => b.compare(a)) // 从大到小排序

		// 优化搜索策略：除法 -> 乘法 -> 取模 -> 减法 -> 加法
		for (const key of sorted_keys) {
			// 尝试除法
			try {
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

			// 尝试乘法
			try {
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

			// 尝试取模
			try {
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
		num = bigfloat(num)
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
