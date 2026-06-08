'use client'

import { useState } from 'react'

type BusinessType = 'fashion' | 'food' | 'electronics' | 'beauty' | 'services' | 'general'

interface RegisterResult {
  success: true
  merchant_id: string
  business_name: string
  api_key: string
  bot_name?: string
  webhook_url: string
  webhook_registered: boolean
  webhook_error?: string
  next_steps: {
    import_products: string
    test_bot: string
  }
}

interface FormState {
  business_name: string
  owner_name: string
  email: string
  whatsapp_number: string
  business_type: BusinessType
  telegram_bot_token: string
}

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  fashion: '👗 Fashion & Clothing',
  food: '🍔 Food & Restaurants',
  electronics: '📱 Electronics & Gadgets',
  beauty: '💄 Beauty & Cosmetics',
  services: '🛠 Services & Consulting',
  general: '🏪 General / Other',
}

export default function OnboardPage() {
  const [form, setForm] = useState<FormState>({
    business_name: '',
    owner_name: '',
    email: '',
    whatsapp_number: '',
    business_type: 'general',
    telegram_bot_token: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RegisterResult | null>(null)
  const [copied, setCopied] = useState<'api_key' | 'webhook' | null>(null)

  function update(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/merchants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: form.business_name,
          owner_name: form.owner_name,
          email: form.email,
          whatsapp_number: form.whatsapp_number || undefined,
          business_type: form.business_type,
          telegram_bot_token: form.telegram_bot_token,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Registration failed. Please try again.')
        return
      }

      setResult(data as RegisterResult)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, field: 'api_key' | 'webhook') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (result) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">✓</div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">You&rsquo;re live!</h1>
              <p className="text-sm text-zinc-500">{result.business_name} is ready to take orders</p>
            </div>
          </div>

          {!result.webhook_registered && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Webhook not registered:</strong> {result.webhook_error}.<br />
              You&rsquo;ll need to set it manually in Telegram. Use the URL below.
            </div>
          )}

          {result.webhook_registered && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ✓ Telegram webhook registered — your bot is live and receiving messages.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">
                API Key <span className="text-red-500 font-normal">(save this — shown once)</span>
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 block bg-zinc-900 text-green-400 text-sm rounded-lg px-3 py-2.5 font-mono overflow-x-auto">
                  {result.api_key}
                </code>
                <button
                  onClick={() => copyToClipboard(result.api_key, 'api_key')}
                  className="shrink-0 px-3 py-2.5 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  {copied === 'api_key' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">
                Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 block bg-zinc-50 text-zinc-700 text-xs rounded-lg px-3 py-2.5 font-mono overflow-x-auto border border-zinc-200">
                  {result.webhook_url}
                </code>
                <button
                  onClick={() => copyToClipboard(result.webhook_url, 'webhook')}
                  className="shrink-0 px-3 py-2.5 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  {copied === 'webhook' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">
                Merchant ID
              </label>
              <code className="block bg-zinc-50 text-zinc-600 text-xs rounded-lg px-3 py-2.5 font-mono border border-zinc-200">
                {result.merchant_id}
              </code>
            </div>
          </div>

          <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-800 mb-3">Next steps</h2>
            <ol className="text-sm text-zinc-600 space-y-2 list-decimal list-inside">
              <li>
                <strong>Import your products</strong> — upload a CSV via the import endpoint using your API key
              </li>
              <li>
                <strong>Test your bot</strong> — {result.next_steps.test_bot}
              </li>
              <li>
                <strong>Share the bot link</strong> — customers can find your bot on Telegram and start ordering
              </li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">Get your bot live</h1>
          <p className="mt-2 text-zinc-500">
            Connect your Telegram bot and start taking orders in minutes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Business name *</label>
              <input
                type="text"
                value={form.business_name}
                onChange={e => update('business_name', e.target.value)}
                placeholder="Zara Fashion Lagos"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Your name *</label>
              <input
                type="text"
                value={form.owner_name}
                onChange={e => update('owner_name', e.target.value)}
                placeholder="Amaka Obi"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Business email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              placeholder="hello@yourbusiness.com"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Business type *</label>
            <select
              value={form.business_type}
              onChange={e => update('business_type', e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
            >
              {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Telegram bot token *
            </label>
            <input
              type="text"
              value={form.telegram_bot_token}
              onChange={e => update('telegram_bot_token', e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
            <p className="mt-1.5 text-xs text-zinc-400">
              Get this from{' '}
              <span className="font-medium text-zinc-600">@BotFather</span> on Telegram →{' '}
              <em>/newbot</em> or <em>/mybots</em>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              WhatsApp number <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={form.whatsapp_number}
              onChange={e => update('whatsapp_number', e.target.value)}
              placeholder="+2348012345678"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting your bot…' : 'Launch my bot →'}
          </button>

          <p className="text-center text-xs text-zinc-400">
            Free 30-day trial · No credit card required
          </p>
        </form>
      </div>
    </div>
  )
}
