import {
	number_node_t,
	add,
	mergeDictionary
} from './dict_ast.mjs'

/**
 * 递归生成数字的所有可能组合的字典。
 * @param {string} n 数字字符串。
 * @param {import('@steve02081504/bigfloat').bigfloat} max_value 最大值限制。
 * @param {Map<string, Map<string, import('./dict_ast.mjs').ast_node_t>>} [cache] 子串结果缓存。
 * @returns {Map<string, import('./dict_ast.mjs').ast_node_t>} 包含数字 n 所有可能组合的字典。
 */
export function generateRecursive(n, max_value, cache = new Map()) {
	if (cache.has(n)) return cache.get(n)
	let result = new Map()

	if (n.length !== 1)
		for (let i = 1; i < n.length; i++) {
			const left = n.slice(0, i)
			const right = n.slice(i)
			if (!left || !right) continue
			const current = mergeDictionary(
				generateRecursive(left, max_value, cache),
				generateRecursive(right, max_value, cache),
				max_value,
			)
			for (const [k, v] of current)
				add(result, k, v)
		}

	add(result, n, new number_node_t(n))
	cache.set(n, result)
	return result
}
