// Blocks commits that contain secrets. Run by .githooks/pre-commit on staged files,
// or by hand with `node scripts/secret-scan.mjs --all` to scan every tracked file.
// The Firebase web config (apiKey etc.) is public by design and is NOT flagged.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const BLOCKED_NAMES = [
  /service-?account.*\.json$/i,
  /-firebase-adminsdk-.*\.json$/i,
  /credentials.*\.json$/i,
  /application_default_credentials\.json$/i,
  /^\.env$/,
  /^\.env\.(?!example$).+/,
  /\.(pem|p12|pfx|key)$/i,
]

// Patterns are assembled from parts so this file does not match itself.
const CONTENT_RULES = [
  ['private key block', new RegExp('-----BEGIN (?:[A-Z]+ )?PRIVATE ' + 'KEY-----')],
  ['service account key', new RegExp(String.raw`"type"\s*:\s*"service` + '_account"')],
  ['Google OAuth token', /\bya29\.[0-9A-Za-z_-]{20,}/],
  ['Firebase CLI refresh token', /\b1\/\/0[0-9A-Za-z_-]{40,}/],
  ['Anthropic API key', /\bsk-ant-[0-9A-Za-z_-]{20,}/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[0-9A-Za-z]{36,}\b/],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{10,}/],
]

const SELF = new Set(['secret-scan.mjs', 'secret-scan.test.mjs'])

export function scanName(path) {
  const name = basename(path)
  return BLOCKED_NAMES.some((re) => re.test(name)) ? `blocked file name: ${name}` : null
}

export function scanText(text) {
  return CONTENT_RULES.filter(([, re]) => re.test(text)).map(([label]) => label)
}

function listFiles(all) {
  const args = all
    ? ['ls-files', '-z']
    : ['diff', '--cached', '--name-only', '--diff-filter=ACM', '-z']
  return execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean)
}

function main() {
  const problems = []
  for (const path of listFiles(process.argv.includes('--all'))) {
    const nameProblem = scanName(path)
    if (nameProblem) problems.push(`${path}: ${nameProblem}`)
    if (SELF.has(basename(path)) || path.endsWith('package-lock.json')) continue
    let text
    try {
      text = readFileSync(path, 'utf8')
    } catch {
      continue
    }
    if (text.includes('\0')) continue // binary
    for (const label of scanText(text)) problems.push(`${path}: ${label}`)
  }
  if (problems.length) {
    console.error('Secret scan FAILED. Remove these before committing:')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log('Secret scan passed.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
