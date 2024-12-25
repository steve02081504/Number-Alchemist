import { bigfloat } from './bigfloat.mjs'
import { expression_dictionary_t } from './dict.mjs'

const baseNumInput = document.getElementById('base-num')
const targetNumInput = document.getElementById('target-num')
const proofExpressionDiv = document.getElementById('proof-expression')
const errorMessageDiv = document.getElementById('error-message')

/**
 * @type {expression_dictionary_t}
 */
let dictionary

function prove() {
	const targetNumStr = String(bigfloat.eval(targetNumInput.value))

	proofExpressionDiv.textContent = ''
	errorMessageDiv.textContent = ''

	try {
		const proof = dictionary(targetNumStr)
		proofExpressionDiv.textContent = `${targetNumInput.value} = `
		if (targetNumInput.value != targetNumStr)
			proofExpressionDiv.textContent += `${targetNumStr} = `
		proofExpressionDiv.textContent += proof
	} catch (error) {
		errorMessageDiv.textContent = error.message
	}
}

function reinitDictionary() {
	const baseNumStr = baseNumInput.value
	dictionary = expression_dictionary_t(baseNumStr)

	prove()
}

baseNumInput.addEventListener('input', reinitDictionary)
targetNumInput.addEventListener('input', prove)

reinitDictionary() // 首次加载时触发一次
