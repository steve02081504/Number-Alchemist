import { bigfloat } from './bigfloat.mjs'
import { expression_dictionary_t } from './dict.mjs'

const baseNumInput = document.getElementById('base-num')
const baseNumIncrButton = document.getElementById('base-num-incr')
const baseNumDecrButton = document.getElementById('base-num-decr')
const targetNumInput = document.getElementById('target-num')
const targetNumIncrButton = document.getElementById('target-num-incr')
const targetNumDecrButton = document.getElementById('target-num-decr')
const proofExpressionDiv = document.getElementById('proof-expression')
const errorMessageDiv = document.getElementById('error-message')

/**
 * @type {expression_dictionary_t}
 */
let dictionary

function prove() {
	const targetNumStr = String(bigfloat.eval(targetNumInput.value.replaceAll('^', '**')))

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

function setupButton(button, input, increment) {
	const changeValue = () => {
		const currentValue = bigfloat.eval(input.value.replaceAll('^', '**'))
		input.value = String(currentValue.add(increment))
		if (input == targetNumInput) prove()
		else if (input == baseNumInput) reinitDictionary()
	}

	let intervalId
	button.addEventListener('pointerdown', () => {
		changeValue()
		intervalId = setInterval(changeValue, 200)
	})

	button.addEventListener('pointerup', () => clearInterval(intervalId))
	button.addEventListener('pointerleave', () => clearInterval(intervalId))
	button.addEventListener('click', e => e.preventDefault())
}
function setupBothButton(input, up, down) {
	setupButton(up, input, 1)
	setupButton(down, input, -1)
}
setupBothButton(baseNumInput, baseNumIncrButton, baseNumDecrButton)
setupBothButton(targetNumInput, targetNumIncrButton, targetNumDecrButton)


// 根据浏览器主题设置颜色模式
document.documentElement.setAttribute('data-theme',
	window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
)
