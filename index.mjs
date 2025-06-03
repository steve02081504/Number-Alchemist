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

async function prove() {
	const targetNumStr = String(bigfloat.eval(targetNumInput.value.replaceAll('^', '**')))

	proofExpressionDiv.textContent = ''
	errorMessageDiv.textContent = 'loading...'

	dictionary(targetNumStr, Infinity, async str => {
		proofExpressionDiv.textContent = `${targetNumInput.value} = `
		if (targetNumInput.value != targetNumStr)
			proofExpressionDiv.textContent += `${targetNumStr} = `
		proofExpressionDiv.textContent += str
		await new Promise(resolve => setTimeout(resolve, 0))
	}).catch(e => {
		errorMessageDiv.textContent = e.message
	}).then(() => {
		errorMessageDiv.textContent = ''
	})
}

async function reinitDictionary() {
	const baseNumStr = baseNumInput.value
	errorMessageDiv.textContent = 'loading...'
	await new Promise(resolve => setTimeout(resolve, 0))
	dictionary = expression_dictionary_t(baseNumStr)
	errorMessageDiv.textContent = ''
	await new Promise(resolve => setTimeout(resolve, 0))

	await prove()
}

baseNumInput.addEventListener('input', reinitDictionary)
targetNumInput.addEventListener('input', prove)

reinitDictionary() // 首次加载时触发一次

function setupButton(button, input, increment) {
	const changeValue = async () => {
		const currentValue = bigfloat.eval(input.value.replaceAll('^', '**'))
		input.value = String(currentValue.add(increment))
		if (input == targetNumInput) await prove()
		else if (input == baseNumInput) await reinitDictionary()
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
