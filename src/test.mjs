import { expression_dictionary_t, bigfloat } from './index.mjs'
import ansiEscapes from 'ansi-escapes'

expression_dictionary_t.prototype.test = async function(num) {
	num = bigfloat(num)
	const proof = await this.prove(num, { max_depth: 17 })
	const num_result = bigfloat.eval(proof.replaceAll('^', '**'))
	if (num_result.equals(num))
		return proof
	else {
		let result2
		try {
			result2 = eval(proof.replaceAll('^', '**'))
		} catch (e) {
			console.log(`证明 ${num} 失败：${proof} -> ${num_result}`)
			throw e
		}
		if (num_result.equals(result2))
			throw new Error(`证明 ${num} 失败：${proof} -> ${num_result}`)
		else
			throw new Error(`bigfloat.eval 有问题，证明 ${num} 失败：${proof} -> ${num_result}(from bigfloat.eval) != ${result2}(from eval)`)
	}
}

const dict = expression_dictionary_t(114514)
console.log('字典大小:', dict.data.size)
dict(1)

async function testlog(num) {
	console.log(ansiEscapes.clearTerminal, await dict.test(num))
}

for (let i = 0; i < 100; i++) {
	const num = Math.floor(Math.random() * 1000) - 500
	await testlog(num)
}
await testlog(114514)
await testlog(114514 * 2)
await testlog(114514 * 3)
await testlog(114514 + 3)
await testlog(-3)
await testlog(72)
await testlog(1919810)
await testlog(45450721)
// 随机100个测试
for (let i = 0; i < 100; i++) {
	const num = Math.floor(Math.random() * 10000000) - 5000000
	await testlog(num)
}
