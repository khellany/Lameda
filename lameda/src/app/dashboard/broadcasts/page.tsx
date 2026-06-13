/**
 * /dashboard/broadcasts — STORY-030
 *
 * Broadcast campaign manager. Shows past campaigns and a compose form.
 * The compose form calls POST /api/broadcasts via a Server Action.
 * NDPR notice is displayed before sending.
 */

'use client'

import { useState } from 'react'
import { sendBroadcast } from './actions'

type Segment = 'all_opted_in' | 'past_buyers' | 'abandoned_cart'

const SEGMENT_LABELS: Record<Segment, { label: string; description: string }> = {
  all_opted_in:   { label: 'All opted-in customers', description: 'Everyone who has consented to marketing messages' },
  past_buyers:    { label: 'Past buyers', description: 'Customers with at least one paid order' },
  abandoned_cart: { label: 'Abandoned cart', description: 'Customers with items in cart who haven\'t checked out' },
}

interface SendResult {
  ok: boolean
  campaign_id?: string
  sent?: number
  failed?: number
  total?: number
  message?: string
  error?: string
}

export default function BroadcastsPage() {
  const [segment, setSegment] = useState<Segment>('all_opted_in')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const charCount = message.length

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) { setError('Please confirm NDPR consent before sending.'); return }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await sendBroadcast(segment, message)
      if (!data.ok) { setError(data.error ?? 'Send failed'); return }
      setResult(data)
      setMessage('')
      setConfirmed(false)
    } catch {
      setError('Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Broadcasts</h1>
        <p className="text-sm text-zinc-500">Send a message to a segment of your opted-in customers.</p>
      </div>

      <form onSubmit={handleSend} className="bg-white rounded-2xl border border-zinc-100 p-6 space-y-5">
        {/* Segment */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Audience</label>
          <div className="space-y-2">
            {(Object.entries(SEGMENT_LABELS) as [Segment, { label: string; description: string }][]).map(([value, meta]) => (
              <label
                key={value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  segment === value ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <input
                  type="radio"
                  name="segment"
                  value={value}
                  checked={segment === value}
                  onChange={() => setSegment(value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{meta.label}</p>
                  <p className="text-xs text-zinc-400">{meta.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-zinc-700">Message</label>
            <span className={`text-xs ${charCount > 900 ? 'text-red-500' : 'text-zinc-400'}`}>
              {charCount}/1000
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! 👋 We have a special offer just for you…"
            required
            maxLength={1000}
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
          />
        </div>

        {/* NDPR consent */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>NDPR confirmation:</strong> I confirm this message will only be sent to
              customers who have opted in to marketing messages, and that the content complies
              with applicable data protection regulations.
            </p>
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {result?.ok && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            ✅ Sent to <strong>{result.sent}</strong> customer{result.sent !== 1 ? 's' : ''}
            {result.failed ? ` · ${result.failed} failed` : ''}.
            {result.message && ` ${result.message}`}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !message.trim() || !confirmed}
          className="w-full py-3 px-4 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send broadcast'}
        </button>
      </form>
    </div>
  )
}
