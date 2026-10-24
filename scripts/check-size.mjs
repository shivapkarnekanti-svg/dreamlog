// Fails the build if total gzipped JS in dist/assets exceeds the budget (SPEC: JS <= 300 KB gz).
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const BUDGET = 300 * 1024
const dir = join('dist', 'assets')
let total = 0
for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
  const size = gzipSync(readFileSync(join(dir, f))).length
  total += size
  console.log(`${f}: ${(size / 1024).toFixed(1)} KB gz`)
}
console.log(`total JS: ${(total / 1024).toFixed(1)} KB gz (budget ${BUDGET / 1024} KB)`)
if (total > BUDGET) {
  console.error('Bundle size budget exceeded')
  process.exit(1)
}
