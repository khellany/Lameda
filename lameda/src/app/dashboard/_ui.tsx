/**
 * Shared, server-rendered presentation helpers for the merchant dashboard.
 * No 'use client' — these are pure render helpers used inside Server Components.
 */

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${cls}`}
    >
      {status}
    </span>
  )
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
