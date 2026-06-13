'use client'

import { useState, useTransition } from 'react'
import { setDirectoryListing } from './actions'

interface Props {
  initialListed: boolean
  businessName: string
}

export function DirectoryToggle({ initialListed, businessName }: Props) {
  const [listed, setListed] = useState(initialListed)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !listed
    setListed(next) // optimistic
    setError(null)

    startTransition(async () => {
      const result = await setDirectoryListing(next)
      if (result.error) {
        setListed(!next) // revert
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900">
            List <span className="font-semibold">{businessName}</span> on the public directory
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Customers browsing{' '}
            <span className="font-mono">/discover</span> will see your store and can tap
            through to your Telegram bot.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={isPending}
          aria-pressed={listed}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none',
            listed ? 'bg-zinc-900' : 'bg-zinc-200',
            isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform',
              listed ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
      </div>

      {listed && (
        <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
          Your store is listed. Changes appear on the directory within 30 minutes.
        </p>
      )}
      {!listed && (
        <p className="text-xs text-zinc-400">
          Your store is hidden from the public directory.
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
