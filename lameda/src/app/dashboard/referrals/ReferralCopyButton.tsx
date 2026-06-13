'use client'

import { useState } from 'react'

export function ReferralCopyButton({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false)

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/onboard?ref=${referralCode}`
      : `/onboard?ref=${referralCode}`

  function copy() {
    const link =
      typeof window !== 'undefined'
        ? `${window.location.origin}/onboard?ref=${referralCode}`
        : `/onboard?ref=${referralCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-sm bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-3.5 py-2.5 font-mono truncate">
        {referralLink}
      </code>
      <button
        onClick={copy}
        className="shrink-0 px-4 py-2.5 text-sm bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
