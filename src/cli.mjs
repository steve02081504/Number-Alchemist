#!/usr/bin/env node
import { expression_dictionary_t, bigfloat } from './index.mjs'

const args = process.argv.slice(2)

if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
	console.log(`\
Usage: number-alchemist <base> <target> [--depth <n>]

  base    The cardinal number whose digits are used to build expressions.
  target  The target number to prove (supports arithmetic like "1000-7").
  --depth Maximum search depth (default: Infinity).

Examples:
  number-alchemist 114514 1000
  number-alchemist 114514 1919810 --depth 10
`)
	process.exit(args.length < 2 ? 1 : 0)
}

const baseStr = args[0]
const targetStr = args[1]
let max_depth = Infinity

const depthIdx = args.indexOf('--depth')
if (depthIdx !== -1 && args[depthIdx + 1])
	max_depth = Number(args[depthIdx + 1])

const target = bigfloat.eval(targetStr.replaceAll('^', '**'))

process.stderr.write(`base=${baseStr}  target=${target}\nbuilding dictionary...`)
const dict = expression_dictionary_t(baseStr)
process.stderr.write(` done (${dict.data.size} entries)\n`)

let latest = ''
const result = await dict.prove(target, {
	max_depth,
	onProgress: (node) => {
		latest = String(node)
		process.stderr.write(`\r${target} = ${latest}                    `)
	},
})
process.stderr.write(`\r${target} = ${result}                    \n`)
