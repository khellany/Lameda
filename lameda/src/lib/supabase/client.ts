import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Supabase browser client - safe to use in Client Components.
 * Uses the anon key only. Row Level Security enforces all data access.
 *
 * Usage:
 *   const supabase = createClient()
 *   const { data } = await supabase.from('merchants').select('*')
 *
 * TECHNICAL DEBT:
 * - This returns a new client instance on every call. For components
 *   that re-render frequently, memoize this with useMemo or move to
 *   a React context. Acceptable for MVP where dashboard is simple.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
