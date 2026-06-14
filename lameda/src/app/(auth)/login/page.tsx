'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type View = 'login' | 'forgot'

export default function LoginPage() {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Incorrect email or password. Check your welcome email for your login details.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setLoading(false)

    if (resetError) {
      setError('Could not send reset email. Please try again.')
      return
    }

    setResetSent(true)
  }

  function switchView(next: View) {
    setView(next)
    setError(null)
    setResetSent(false)
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Merchant Dashboard</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {view === 'login'
              ? 'Sign in to manage your orders and products'
              : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-7 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="hello@yourbusiness.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-zinc-700">Password</label>
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
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
              className="w-full py-2.5 px-4 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-7">
            {resetSent ? (
              <div className="text-center space-y-3 py-2">
                <div className="text-2xl">✉️</div>
                <p className="text-sm font-medium text-zinc-900">Check your inbox</p>
                <p className="text-xs text-zinc-500">
                  We sent a reset link to{' '}
                  <span className="font-medium text-zinc-700">{email}</span>.
                  It expires in 1 hour.
                </p>
                <button
                  onClick={() => switchView('login')}
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-800 transition-colors underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="hello@yourbusiness.com"
                    required
                    autoFocus
                    autoComplete="email"
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
                  className="w-full py-2.5 px-4 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>

                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-zinc-400">
          New to Lameda?{' '}
          <a href="/onboard" className="text-zinc-600 font-medium hover:underline">
            Register your bot
          </a>
        </p>

      </div>
    </div>
  )
}
