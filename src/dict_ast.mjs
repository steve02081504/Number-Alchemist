import { bigfloat } from '@steve02081504/bigfloat'
import { replace_able_t } from './replace_able.mjs'

/**
 * 运算符优先级枚举。
 * @enum {number}
 */
export const precedence_t = {
	[undefined]: 0,
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
	cache
	/**
	 * @type {Set<WeakRef<operator_node_t>>}
	 */
	parents
	constructor() {
		const self = super()
		self.cache = {}
		self.parents = new Set()
	}
	/**
	 * 被替换时调用。
	 * @param {ast_node_t} obj 被替换的对象。
	 */
	get_replaced(obj) {
		// 清理当前节点的缓存
		this.clearParentsCache()
		// 清空当前节点的父节点集合
		obj.parents = new Set([...new Set([...this.parents, ...obj.parents].map(ref => ref.deref()).filter(Boolean))].map(parent => new WeakRef(parent)))
	}
	/**
	 * 将 AST 节点转换为表达式字符串。
	 * @returns {string} 节点对应的表达式字符串。
	 */
	toString(...args) {
		return this.cache.to_string ??= this.toStringImpl(...args)
	}

	/**
	 * 转到表达式字符串的实现。
	 * @abstract
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
		return this.cache.calculate ??= this.calculateImpl()
	}

	/**
	 * 获取节点对应的计算结果的实现。
	 * @abstract
	 * @returns {bigfloat} 节点对应的计算结果。
	 */
	calculateImpl() {
		throw new Error('Not implemented')
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

	/**
	 * 清理父节点的缓存
	 */
	clearParentsCache() {
		for (const parentRef of this.parents) {
			const parent = parentRef.deref()
			if (parent) {
				const old_cache = parent.cache
				parent.cache = {}
				if (Object.keys(old_cache).length) parent.clearParentsCache()
			} else this.parents.delete(parentRef) // 父节点已被垃圾回收，从集合中移除
		}
	}

	/**
	 * 注册父节点
	 * @param {operator_node_t} parent 父节点
	 */
	registerParent(parent) {
		this.parents.add(new WeakRef(parent))
	}

	/**
	 * 取消注册父节点
	 * @param {operator_node_t} parent 父节点
	 */
	unregisterParent(parent) {
		for (const parentRef of this.parents)
			if (parentRef.deref() === parent) {
				this.parents.delete(parentRef)
				break
			}
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

	toStringImpl() {
		return String(this.value)
	}

	calculateImpl() {
		return bigfloat(this.value)
	}

	toJSON() {
		return this.toString()
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
		// 辅助函数，用于获取节点的“绝对值”形式
		// 如果是 u- 节点，返回其子节点；否则返回自身
		const get_abs_node = (node) => node instanceof operator_node_t && node.operator === 'u-' ? node.children[0] : node
		// 辅助函数，判断节点是否为一元负号节点
		const is_neg_node = (node) => node instanceof operator_node_t && node.operator === 'u-'

		// 1. 一元负号的简化: -(-x) => x
		if (operator === 'u-') {
			const operand = children[0]
			if (operand instanceof operator_node_t && operand.operator === 'u-') {
				this.clearParentsCache() // 清理被替换节点的父节点缓存
				return operand.children[0] // 返回其子节点，实现负负得正
			}
		}

		// 2. 二元运算符的简化 (加减法已部分实现，这里补充乘除法和零一优化)
		if (children.length === 2) {
			const [left, right] = children

			// 乘法和除法中的负数规范化
			// 目标：将负号提取到整个子表达式的最外层，或消除负号
			// 例如：A * (-B) => -(A * B); (-A) * (-B) => A * B
			const left_abs = get_abs_node(left)
			const right_abs = get_abs_node(right)
			const left_is_negative = is_neg_node(left)
			const right_is_negative = is_neg_node(right)

			if (operator === '*' || operator === '/')
				if (left_is_negative && right_is_negative) {
					// (-A) * (-B) => A * B
					// (-A) / (-B) => A / B
					this.operator = operator // 保持原有操作符
					this.children = [left_abs, right_abs] // 使用绝对值形式的子节点
				} else if (left_is_negative || right_is_negative) {
					// A * (-B) => -(A * B)
					// (-A) * B => -(A * B)
					// A / (-B) => -(A / B)
					// (-A) / B => -(A / B)
					// 创建一个不带负号的二元操作节点，然后用 u- 包裹它
					const new_binary_op_node = new operator_node_t(operator, [left_abs, right_abs])
					this.clearParentsCache() // 清理被替换节点的父节点缓存
					return new operator_node_t('u-', [new_binary_op_node]) // 返回一元负号节点
				}

			// 幂运算简化
			if (operator === '^') {
				const exp = right.calculate()
				// 负指数产生分数，在表达式字典中不适用，抛出让上层跳过此操作
				if (exp.sign) throw new RangeError('negative exponent')
				// 底数为负数：(-A)^偶数 => A^偶数；(-A)^奇数 => -(A^奇数)
				if (left_is_negative && exp.floor().equals(exp))
					if (exp.abs().floor() % 2n === 0n)
						this.children = [left_abs, right]
					else {
						const new_pow_node = new operator_node_t('^', [left_abs, right])
						this.clearParentsCache()
						return new operator_node_t('u-', [new_pow_node])
					}
			}
		}
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
		// 注册父节点
		for (const child of children)
			child.registerParent(this)
	}

	toStringImpl() {
		const { operator, children } = this

		// 一元运算符
		if (operator === 'u-') {
			const operand_str = this.formatOperand(children[0], this, false)
			return `-${operand_str}`
		}

		// 二元运算符
		const [left, right] = children
		const left_str = this.formatOperand(left, this, true)
		const right_str = this.formatOperand(right, this, false)

		return `${left_str}${operator}${right_str}`
	}

	/**
	 * 格式化操作数，根据需要添加括号。
	 * @param {ast_node_t} operand 子操作数节点。
	 * @param {ast_node_t} parent 父节点。
	 * @param {boolean} is_left 是否为左操作数。
	 * @returns {string} 格式化后的操作数字符串。
	 */
	formatOperand(operand, parent, is_left) {
		if (!(operand instanceof operator_node_t))
			return operand.toString()

		const { operator } = operand

		// 同级运算符的结合性
		if (parent.operator === operator) {
			if ((parent.operator === '-' || parent.operator === '/') && !is_left)
				return `(${operand.toString()})`

			// 左结合：左操作数一侧可直接写出，如 a-b-c、(a/b)/c
			if ((parent.operator === '-' || parent.operator === '/') && is_left)
				return operand.toString()

			// 加法和幂运算满足结合律，右操作数无需括号
			if (parent.operator === '+' || parent.operator === '^')
				return operand.toString()

			// 乘法：左操作数无需括号；右操作数若最左路径含 % 或 /，会破坏左结合语义
			// 例如 a*(b%c*d) 若省略括号写成 a*b%c*d，会被解析为 ((a*b)%c)*d
			if (parent.operator === '*') {
				const isCleanLeftPath = (node, op) => {
					if (!(node instanceof operator_node_t)) return true
					if (node.operator !== op) return false
					return isCleanLeftPath(node.children[0], op)
				}
				return is_left || isCleanLeftPath(operand, '*') ? operand.toString() : `(${operand.toString()})`
			}

			// 一元负号
			if (parent.operator === 'u-')
				return `(${operand.toString()})`
		}

		// 优先级相同但运算符不同（左结合）：仅右操作数需括号
		if (precedence_t[parent.operator] === precedence_t[operator])
			return is_left ? operand.toString() : `(${operand.toString()})`

		// JS 中 -expr**n 是语法错误，一元负号作为幂运算左操作数时必须加括号
		if (parent.operator === '^' && operator === 'u-')
			return `(${operand.toString()})`

		// 不同级运算符的优先级
		if (precedence_t[operator] < precedence_t[parent.operator])
			return `(${operand.toString()})`

		return operand.toString()
	}

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
 * @param {bigfloat|string} key 键。
 * @param {ast_node_t} value 值（AST 节点）。
 */
export function add(dict, key, value) {
	key = String(key)
	if (!dict.has(key))
		dict.set(key, value)
	else if (dict.get(key).toString().length > value.toString().length)
		dict.get(key).replace(value)
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
			// 乘法
			add(result, key1.mul(key2), new operator_node_t('*', [val1, val2]))
			if (!key2.equals(0)) {
				// 减法
				add(result, key1.sub(key2), new operator_node_t('-', [val1, val2]))
				// 取模
				const mod = key1.mod(key2)
				add(result, mod, new operator_node_t('%', [val1, val2]))
				// 除法 (如果可以整除才添加)
				if (mod.equals(0))
					add(result, key1.div(key2), new operator_node_t('/', [val1, val2]))
			}
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
