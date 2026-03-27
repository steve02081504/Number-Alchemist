import { bigfloat } from '@steve02081504/bigfloat'
import {
	number_node_t,
	add,
	mergeDictionary
} from './dict_ast.mjs'

/**
 * 用于缓存 generateRecursive 函数的结果，避免重复计算。
 * @type {Map<string, Map<string, import('./dict_ast.mjs').ast_node_t>>}
 */
const generateCache = new Map()

/**
 * 递归生成数字的所有可能组合的字典。
 * @param {string} n 数字字符串。
 * @param {import('@steve02081504/bigfloat').bigfloat} max_value 最大值限制。
 * @returns {Map<string, import('./dict_ast.mjs').ast_node_t>} 包含数字 n 所有可能组合的字典。
 */
export function generateRecursive(n, max_value) {
	if (generateCache.has(n)) return generateCache.get(n)
	let result = new Map()

	if (n.length !== 1)
		for (let i = 1; i < n.length; i++) {
			const left = n.slice(0, i)
			const right = n.slice(i)
			if (!left || !right) continue
			result = mergeDictionary(generateRecursive(left, max_value), generateRecursive(right, max_value), max_value)
		}

	add(result, bigfloat(n), new number_node_t(n))
	generateCache.set(n, result)
	return result
}
