import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CookieOptions } from '@supabase/ssr'

/**
 * Supabase server client for use in Server Components, API Routes,
 * and Server Actions. Reads/writes the session cookie automatically.
 *
 * Uses the anon key. RLS still enforces data access per the
 * authenticated user's JWT claims.
 *
 * Usage (Server Component or API Route):
 *   const supabase = await createServerSupabaseClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

/**
 * Supabase admin client using the service role key.
 * BYPASSES Row Level Security entirely.
 *
 * Use ONLY in:
 * - Webhook handlers (no user session available)
 * - Background jobs (pg-boss workers)
 * - Internal admin operations
 *
 * NEVER expose this client to the browser.
 * NEVER use this in Client Components.
 *
 * TECHNICAL DEBT:
 * - The admin client is a singleton created per-request today.
 *   At high webhook volume, connection pool pressure may become an
 *   issue. Consider Supabase connection pooler (pgBouncer mode)
 *   at 500+ merchants. See ADR-001.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // Disable Realtime to prevent WebSocket initialization errors in
      // Node.js 20 serverless environments (Vercel). Webhook handlers and
      // background jobs use REST only — they do not need Realtime subscriptions.
      // Node.js 22+ has native WebSocket; revisit when Vercel upgrades default runtime.
      global: {
        fetch: fetch.bind(globalThis),
      },
      realtime: {
        params: { eventsPerSecond: -1 },
      },
    }
  )
}
