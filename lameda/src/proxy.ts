/**
 * Edge Proxy — Next.js 16's renamed "middleware" (see node_modules/next docs:
 * "Starting with Next.js 16, Middleware is now called Proxy").
 *
 * Purpose: a single, fail-closed authentication gate so protected routes can no
 * longer be reached without a credential, even if a future handler forgets to
 * check. This centralises the posture; it does NOT replace per-route auth.
 *
 * DESIGN — optimistic checks only (per Next.js 16 guidance: proxy "should not be
 * used as a full session management or authorization solution" and must not do
 * slow data fetching). This proxy performs ZERO network I/O — it inspects cookies
 * and headers in memory and rejects obviously-unauthenticated requests early.
 * The AUTHORITATIVE checks remain at the data layer:
 *   - /dashboard/**  → getDashboardContext() validates the session + maps to merchant
 *   - api-key routes → resolveMerchantFromApiKey() validates the key against the DB
 *
 * SCOPE — `config.matcher` runs the proxy ONLY on the paths below. The
 * high-throughput channel webhooks (/api/webhook/**, /api/webhooks/**) and cron
 * jobs are deliberately excluded: they authenticate with their own secret/HMAC,
 * and keeping them off the proxy means the customer-facing bot hot path adds
 * exactly zero proxy overhead. Routes with mixed/legacy auth schemes
 * (/api/products/import, /api/products/[id]/embed) are also excluded so the proxy
 * never rejects a valid legacy-scheme caller.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Optimistic session presence check. @supabase/ssr stores the session in
 * `sb-<project-ref>-auth-token` cookies (chunked as `.0`, `.1` for large tokens).
 * We only check existence here — validity is enforced by getDashboardContext().
 */
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Merchant dashboard — fail closed to /login if there's no session at all.
  if (pathname.startsWith('/dashboard')) {
    if (!hasSupabaseSession(request)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Merchant API-key routes — require a well-formed key. The matcher guarantees
  // only x-merchant-api-key-scheme routes reach this branch.
  if (pathname.startsWith('/api/')) {
    const key = request.headers.get('x-merchant-api-key')
    if (!key || !key.startsWith('lmd_')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/crm/:path*',
    '/api/products/embed-all',
    '/api/merchants/rotate-token',
  ],
}
