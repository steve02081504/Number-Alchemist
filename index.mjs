import { bigfloat } from './bigfloat.mjs'
import { expression_dictionary_t } from './NumberAlchemist.mjs'

const baseNumInput = document.getElementById('base-num')
const targetNumInput = document.getElementById('target-num')
const proofExpressionDiv = document.getElementById('proof-expression')
const errorMessageDiv = document.getElementById('error-message')

/**
 * 缓存字典
 * @type {Map<string, expression_dictionary_t>}
 */
const dictionaryCache = new Map()

function prove() {
	const baseNumStr = baseNumInput.value
	const targetNumStr = String(bigfloat.eval(targetNumInput.value))

	proofExpressionDiv.textContent = ''
	errorMessageDiv.textContent = ''

	try {
		/**
		 * @type {expression_dictionary_t}
		 */
		let dictionary
		if (dictionaryCache.has(baseNumStr))
			dictionary = dictionaryCache.get(baseNumStr)
		else {
			dictionary = new expression_dictionary_t(baseNumStr)
			dictionaryCache.set(baseNumStr, dictionary)
		}

		const proof = dictionary.prove(targetNumStr)
		proofExpressionDiv.textContent = proof
	} catch (error) {
		errorMessageDiv.textContent = error.message
	}
}

baseNumInput.addEventListener('input', prove)
targetNumInput.addEventListener('input', prove)

prove() // 首次加载时触发一次
