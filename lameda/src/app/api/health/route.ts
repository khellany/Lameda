import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/health
 *
 * Health check endpoint for uptime monitoring (UptimeRobot, Vercel checks).
 * Checks both app liveness and database connectivity.
 *
 * Returns 200 if healthy, 503 if the database is unreachable.
 */
export async function GET() {
  const start = Date.now()

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('merchants').select('id').limit(1)

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          db: 'error',
          dbError: error.message,
          latencyMs: Date.now() - start,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'unreachable',
        dbError: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
