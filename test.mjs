import { bigfloat } from './bigfloat.mjs'
import { expression_dictionary_t } from './dict.mjs'
import ansiEscapes from 'npm:ansi-escapes'

// 测试
const dict = expression_dictionary_t(114514)
console.log('字典:', dict.data.size)
dict(1)
async function testlog(num) {
	console.log(ansiEscapes.clearTerminal, await dict.test(num))
}
for (let i = 0; i < 100; i++) {
	const num = Math.floor(Math.random() * 1000) - 500
	await testlog(num)
}
await testlog(114514)
await testlog(114514*2)
await testlog(114514*3)
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
//*/
