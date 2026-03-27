import {
	expression_dictionary_t
} from 'https://esm.sh/@steve02081504/number-alchemist'
import { bigfloat } from 'https://esm.sh/@steve02081504/bigfloat'

const baseNumInput = document.getElementById('base-num')
const baseNumIncrButton = document.getElementById('base-num-incr')
const baseNumDecrButton = document.getElementById('base-num-decr')
const targetNumInput = document.getElementById('target-num')
const targetNumIncrButton = document.getElementById('target-num-incr')
const targetNumDecrButton = document.getElementById('target-num-decr')
const proofExpressionDiv = document.getElementById('proof-expression')
const errorMessageDiv = document.getElementById('error-message')

/** @type {expression_dictionary_t} */
let dictionary

/**
 * 将用户输入的算式解析为 bigfloat（`^` 视为幂运算）。
 * @param {string} expression
 */
function parseNumberExpression(expression) {
	return bigfloat.eval(String(expression).replaceAll('^', '**'))
}

async function prove() {
	const targetNumStr = String(parseNumberExpression(targetNumInput.value))

	proofExpressionDiv.textContent = ''
	errorMessageDiv.textContent = 'loading...'

	try {
		dictionary.prove(targetNumInput.value, {
			onProgress: async (str) => {
				proofExpressionDiv.textContent = `${targetNumInput.value} = `
				if (targetNumInput.value != targetNumStr)
					proofExpressionDiv.textContent += `${targetNumStr} = `
				proofExpressionDiv.textContent += str
				await new Promise(resolve => setTimeout(resolve, 0))
			},
		})
		errorMessageDiv.textContent = ''
	}
	catch (e) {
		errorMessageDiv.textContent = e?.message ?? String(e)
	}
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

reinitDictionary()

function setupButton(button, input, increment) {
	const changeValue = async () => {
		const currentValue = parseNumberExpression(input.value)
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

document.documentElement.setAttribute('data-theme',
	window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
)
