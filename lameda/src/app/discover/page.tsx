/**
 * /discover — Merchant directory v1
 *
 * STORY-033 — Public directory of merchants who opted in.
 * No authentication required. Revalidates every 30 minutes.
 *
 * Only non-PII columns are selected: business_name, business_type, bot_name.
 * The encrypted owner_name / email / telegram_bot_token columns are never touched.
 */

import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 1800 // 30 minutes

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  fashion: 'Fashion',
  food: 'Food & Drinks',
  electronics: 'Electronics',
  beauty: 'Beauty & Care',
  services: 'Services',
  general: 'General',
}

export default async function DiscoverPage() {
  const db = createAdminClient()

  // Only non-PII columns are selected — encrypted owner_name/email/token are never touched.
  const { data: merchants } = await db
    .from('merchants')
    .select('id, business_name, business_type, bot_name')
    .eq('is_active', true)
    .eq('is_directory_listed', true)
    .order('business_name')
    .limit(200)

  const listed = merchants ?? []

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
          <div>
            <span className="font-bold text-zinc-900 text-lg">Lameda</span>
            <span className="ml-2 text-sm text-zinc-500">Merchant Directory</span>
          </div>
          <Link
            href="/onboard"
            className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            List your store &rarr;
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Discover stores on Telegram</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Browse businesses you can shop with directly on Telegram — no app downloads, no
            signups.
          </p>
        </div>

        {listed.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 text-sm">
            No stores listed yet. Be the first to{' '}
            <Link href="/onboard" className="underline text-zinc-600">
              add yours
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listed.map((m) => {
              const typeLabel = BUSINESS_TYPE_LABELS[m.business_type ?? ''] ?? 'Store'
              const botHandle = m.bot_name ?? null

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-zinc-100 p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-zinc-900 leading-snug">
                      {m.business_name}
                    </h2>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 capitalize">
                      {typeLabel}
                    </span>
                  </div>

                  {botHandle ? (
                    <a
                      href={`https://t.me/${botHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto block w-full text-center px-4 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      Shop on Telegram
                    </a>
                  ) : (
                    <span className="mt-auto block w-full text-center px-4 py-2.5 text-sm text-zinc-400 bg-zinc-50 rounded-xl">
                      Coming soon
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 mt-16 py-6 text-center text-xs text-zinc-400">
        Powered by{' '}
        <Link href="/" className="underline">
          Lameda
        </Link>{' '}
        · Want your store here?{' '}
        <Link href="/onboard" className="underline">
          Get started free
        </Link>
      </footer>
    </div>
  )
}
