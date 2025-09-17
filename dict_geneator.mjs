// worker.js
import { bigfloat } from 'https://esm.sh/@steve02081504/bigfloat'
import {
	number_node_t,
	add,
	mergeDictionary
} from './dict_ast.mjs'

/**
 * 用于缓存 generateRecursive 函数的结果，避免重复计算。
 * @type {Map<string, Map<string, ast_node_t>>}
 */
const geneCache = new Map()

/**
 * 递归生成数字的所有可能组合的字典。
 * @param {string} n 数字字符串。
 * @param {bigfloat} max_value 最大值限制。
 * @returns {Map<string, ast_node_t>} 包含数字 n 所有可能组合的字典。
 */
export function generateRecursive(n, max_value) {
	// 如果缓存中已存在结果，直接返回
	if (geneCache.has(n)) return geneCache.get(n)
	let result = new Map()

	// 将数字拆分成左右两部分，递归生成子字典
	if (n.length != 1)
		for (let i = 1; i < n.length; i++) {
			const left = n.slice(0, i)
			const right = n.slice(i)
			if (!left || !right) continue

			result = mergeDictionary(generateRecursive(left, max_value), generateRecursive(right, max_value), max_value)
		}


	// 将当前数字添加到字典中
	add(result, bigfloat(n), new number_node_t(n))
	// 缓存结果
	geneCache.set(n, result)
	return result
}
