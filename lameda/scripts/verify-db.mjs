/**
 * One-off script: verify all migration tables exist in Supabase.
 * Run with: node scripts/verify-db.mjs
 * Delete after use or keep for CI.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import ws from 'ws'

// Read .env.local manually (no dotenv needed for a one-off script)
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  }
)

const expectedTables = [
  'merchants',
  'customers',
  'products',
  'product_embeddings',
  'conversations',
  'messages',
  'orders',
  'payments',
  'webhook_events',
  'audit_logs',
]

console.log('Verifying Lameda database schema...\n')

// Lightweight connectivity check - just query a known system table
const { error: pingError } = await supabase.from('merchants').select('id').limit(0)
if (pingError && pingError.code !== 'PGRST116') {
  console.error('DB connection failed:', pingError.message)
  process.exit(1)
}

let allGood = true

for (const table of expectedTables) {
  const { error: tableError } = await supabase.from(table).select('*').limit(0)
  const status = tableError ? `MISSING - ${tableError.message}` : 'OK'
  const icon = tableError ? '✗' : '✓'
  console.log(`  ${icon}  ${table.padEnd(22)} ${status}`)
  if (tableError) allGood = false
}

console.log()

if (allGood) {
  console.log('All tables verified. Database is ready.')
} else {
  console.log('Some tables are missing. Re-run migrations:')
  console.log('  npx supabase db push')
  process.exit(1)
}
