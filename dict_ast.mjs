import { bigfloat } from './bigfloat.mjs'
import { replace_able_t } from './replace_able.mjs'

/**
 * 运算符优先级枚举。
 * @enum {number}
 */
export const precedence_t = {
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
export class ast_node_t extends replace_able_t {
	/**
	 * 将 AST 节点转换为表达式字符串。
	 * @returns {string} 节点对应的表达式字符串。
	 */
	toString(...args) {
		return this.toStringImpl(...args)
	}

	/**
	 * 获取节点对应的计算结果。
	 * 使用缓存避免重复计算。
	 * @returns {bigfloat} 节点对应的计算结果。
	 */
	calculate() {
		return this.calculateImpl()
	}

	/**
	 * 获取节点的计算步骤。
	 * @returns {{steps: string, value: bigfloat}} 包含计算步骤和结果的对象。
	 */
	getCalculationSteps() {
		return this.getCalculationStepsImpl()
	}

	/**
	 * 获取json序列化后的AST节点。
	 * @returns {Object} json序列化后的AST节点。
	 */
	toJSON() {
		throw new Error('Not implemented')
	}

	/**
	 * 将 json 序列化后的 AST 节点转换为 AST 节点。
	 * @param {Object} json json 序列化后的 AST 节点。
	 * @returns {ast_node_t} 转换后的 AST 节点。
	 */
	static fromJSON(json) {
		if (Object(json) instanceof String) return new number_node_t(json)
		return new operator_node_t(json.operator, json.children.map(child => ast_node_t.fromJSON(child)))
	}
}

/**
 * 数字节点类，表示 AST 中的数字。
 * @class
 * @extends ast_node_t
 */
export class number_node_t extends ast_node_t {
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

	toString() {
		return String(this.value)
	}

	calculate() {
		return bigfloat(this.value)
	}

	getCalculationSteps() {
		return {
			steps: this.value.toString(),
			value: bigfloat(this.value),
		}
	}

	toJSON() {
		return this.value
	}
}

/**
 * 运算符节点类，表示 AST 中的运算符。
 * @class
 * @extends ast_node_t
 */
export class operator_node_t extends ast_node_t {
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
		// 优化：
		// 加一个负值时，优化为减去负值的值
		if (operator === '+' && children[1]?.operator === 'u-') {
			this.operator = '-'
			this.children = [children[0], children[1].children[0]]
		}
		// 减去负值时，优化为加上负值的值
		if (operator === '-' && children[1]?.operator === 'u-') {
			this.operator = '+'
			this.children = [children[0], children[1].children[0]]
		}
	}

	toString(parent_operator) {
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

	calculate() {
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

	getCalculationSteps() {
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

	toJSON() {
		return {
			operator: this.operator,
			children: this.children.map(child => child.toJSON()),
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
	/*
	if (!dict.has(key_str) || dict.get(key_str).toString().length > value.toString().length)
		try {
			// 测试用
			let error_body = ''
			let expr = String(value).replaceAll('^', '**')
			let bfeval_result = bigfloat.eval(expr)
			if (!bfeval_result.equals(key)) {
				error_body += `追加错误key：${value} => ${bfeval_result} != ${key}\n`
				if (eval(expr) != String(bfeval_result))
					error_body += `bfeval的可能错误 => ${eval(expr)}（JS） != ${bfeval_result}（bigfloat）\n`
			}
			let ast_calculate_result = value.calculate()
			if (!ast_calculate_result.equals(key))
				error_body += `计算错误key：${value} => ${ast_calculate_result} != ${key}\n`

			if (error_body) {
				console.trace(error_body)
				debugger
			}
		} catch (e) {
			console.error(e)
		}
	//*/
	if (!dict.has(key_str))
		dict.set(key_str, value)
	else if (dict.get(key_str).toString().length > value.toString().length)
		dict.get(key_str).replace(value)
}

/**
 * 向字典中添加键值对，同时考虑一元负号。
 * @param {Map<string, ast_node_t>} dict 字典。
 * @param {bigfloat} key 键。
 * @param {ast_node_t} value 值（AST 节点）。
 */
export function add(dict, key, value) {
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
export function mergeDictionary(dict_1, dict_2, max_value) {
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
			add(result, key1.mod(key2), new operator_node_t('%', [val1, val2]))
			// 除法 (如果可以整除才添加)
			let div = key1.div(key2)
			if (div.floor().equals(div))
				add(result, div, new operator_node_t('/', [val1, val2]))
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

export function serializeMap(map) {
	return Array.from(map.entries()).map(([k, v]) => [k, v.toJSON()])
}

export function deserializeMap(arr) {
	return new Map(arr.map(([k, v]) => [k, ast_node_t.fromJSON(v)]))
}
