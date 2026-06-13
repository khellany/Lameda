/**
 * Secret scanner — fails (exit 1) if a hardcoded credential is found in tracked
 * code. Wired into CI (.github/workflows/security.yml) and runnable locally via
 * `npm run scan:secrets`. See docs/SECURITY.md.
 *
 * Scans code files only. Skips node_modules/.next/.git/docs and .env* (env files
 * legitimately hold secrets and are gitignored).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.cwd()

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.vercel', 'docs'])
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql'])

// Patterns for credentials that must never be hardcoded in source.
const PATTERNS = [
  { name: 'Anthropic API key',        re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'OpenAI project key',       re: /sk-proj-[A-Za-z0-9_-]{20,}/ },
  { name: 'OpenAI API key',           re: /sk-[A-Za-z0-9]{32,}/ },
  { name: 'JWT (Supabase anon/service key)', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
]

/** @type {{file: string, line: number, kind: string}[]} */
const findings = []

function shouldSkipFile(name) {
  return name.startsWith('.env') || name === 'package-lock.json'
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full)
    } else {
      if (shouldSkipFile(entry)) continue
      if (!SCAN_EXTS.has(extname(entry))) continue
      scanFile(full)
    }
  }
}

function scanFile(file) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const { name, re } of PATTERNS) {
      if (re.test(line)) {
        findings.push({ file: file.replace(ROOT + '\\', '').replace(ROOT + '/', ''), line: i + 1, kind: name })
      }
    }
  })
}

walk(ROOT)

if (findings.length > 0) {
  console.error('✗ Hardcoded secrets detected:\n')
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  — ${f.kind}`)
  }
  console.error('\nMove these to environment variables. See docs/SECURITY.md.')
  process.exit(1)
}

console.log('✓ No hardcoded secrets found.')
