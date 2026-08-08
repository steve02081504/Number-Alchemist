import { expression_dictionary_t, number_node_t, bigfloat } from './index.mjs'
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

{
	// 前导零是基底数字的一部分，表达式里必须保留
	for (const literal of ['0', '07', '0721', '0010']) {
		const node = new number_node_t(literal)
		if (node.toString() !== literal)
			throw new Error(`number_node_t 丢掉了字面量形态：${literal} -> ${node.toString()}`)
		if (!node.calculate().equals(bigfloat(literal)))
			throw new Error(`number_node_t 计算错误：${literal}`)
	}
	const dict0721 = expression_dictionary_t('0721')
	const baseAst = dict0721.getAst('0721')
	if (baseAst?.toString() !== '0721')
		throw new Error(`基底 0721 的字面量丢失：${baseAst?.toString()}`)
	const proof114514 = await dict0721.test(114514)
	if (!proof114514.includes('0721'))
		throw new Error(`证明式应保留前导零，实际为：${proof114514}`)
	console.log('前导零保留测试通过:', proof114514)
}

{
	// 基数 0 仅有 0 与 0^0=1；旧逻辑会走 n=1*n+0 同值递归，在默认 Infinity 深度下直接撑爆调用栈
	const dict0 = expression_dictionary_t('0')
	if (!dict0.data.has('1'))
		throw new Error('基数 0 应能通过 0^0 得到 1')
	const proof = await dict0.prove(114514)
	const evaluated = bigfloat.eval(proof.replaceAll('^', '**'))
	if (!evaluated.equals(114514))
		throw new Error(`基数 0 证明 114514 求值错误：${proof} -> ${evaluated}`)
	console.log('基数 0 证明测试通过:', proof)
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
