import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import ws from 'ws'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
})

const { data: msgs } = await sb.from('messages').select('direction, content, created_at').order('created_at', { ascending: false }).limit(4)
const { data: convs } = await sb.from('conversations').select('id, status, message_count').limit(3)
const { data: customers } = await sb.from('customers').select('id, opted_in, created_at').limit(3)
const { data: webhooks } = await sb.from('webhook_events').select('event_type, status, created_at').order('created_at', { ascending: false }).limit(4)

console.log('\n=== MESSAGES ===')
msgs?.forEach(m => console.log(` [${m.direction}] "${m.content.slice(0, 60)}" (${m.created_at.slice(11, 19)})`))

console.log('\n=== CONVERSATIONS ===')
convs?.forEach(c => console.log(` ${c.id.slice(0, 8)}... | status: ${c.status} | messages: ${c.message_count}`))

console.log('\n=== CUSTOMERS ===')
customers?.forEach(c => console.log(` ${c.id.slice(0, 8)}... | opted_in: ${c.opted_in} | joined: ${c.created_at.slice(0, 10)}`))

console.log('\n=== WEBHOOK EVENTS ===')
webhooks?.forEach(w => console.log(` [${w.status}] ${w.event_type} @ ${w.created_at.slice(11, 19)}`))

console.log('\n✓ End-to-end check complete.')
