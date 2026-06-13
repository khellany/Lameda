'use client'

import { useState, useTransition } from 'react'
import { startSubscriptionCheckout } from './actions'
import type { SubscriptionTier } from '@/lib/payments/subscription'

interface Props {
  tier: SubscriptionTier
  label: string
  highlighted?: boolean
  current?: boolean
}

export function SubscribeButton({ tier, label, highlighted, current }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function go() {
    setError(null)
    startTransition(async () => {
      const result = await startSubscriptionCheckout(tier)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.url) {
        window.location.href = result.url
      }
    })
  }

  return (
    <div className="space-y-2">
      <button
        onClick={go}
        disabled={isPending}
        className={[
          'w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-colors',
          highlighted
            ? 'bg-zinc-900 text-white hover:bg-zinc-800'
            : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
          isPending ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {isPending ? 'Starting checkout…' : current ? `Renew ${label}` : `Choose ${label}`}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
