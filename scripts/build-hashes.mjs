// Writes dist/build-hashes.txt: one "sha256  path" line per built file, sorted, so anyone can
// rebuild a tagged commit and diff the result against what the live site serves.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const OUT = 'build-hashes.txt'
const root = 'dist'

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const lines = walk(root)
  .map((p) => relative(root, p).replaceAll('\\', '/'))
  .filter((p) => p !== OUT)
  .sort()
  .map(
    (p) =>
      `${createHash('sha256')
        .update(readFileSync(join(root, p)))
        .digest('hex')}  ${p}`,
  )

writeFileSync(join(root, OUT), lines.join('\n') + '\n')
console.log(`${OUT}: ${lines.length} files`)
