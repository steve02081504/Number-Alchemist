import { expression_dictionary_t } from './NumberAlchemist.mjs'
import ansiEscapes from 'npm:ansi-escapes'

// 测试
const dict = new expression_dictionary_t(114514)
console.log('字典:', dict.data.size)
function testlog(num) {
	console.log(ansiEscapes.clearTerminal, dict.test(num))
}
for (let i = 0; i < 100; i++) {
	const num = Math.floor(Math.random() * 1000) - 500
	testlog(num)
}
testlog(114514)
testlog(114514*2)
testlog(114514*3)
testlog(114514 + 3)
testlog(-3)
testlog(72)
testlog(1919810)
testlog(45450721)
// 随机100个测试
for (let i = 0; i < 100; i++) {
	const num = Math.floor(Math.random() * 10000000) - 5000000
	testlog(num)
}
