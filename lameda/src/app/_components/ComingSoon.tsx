'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { requestPreviewAccess, type PreviewResult } from '@/app/actions/preview-gate'

const IDLE: PreviewResult = { status: 'idle' }

export function ComingSoon() {
  const [state, formAction, pending] = useActionState(requestPreviewAccess, IDLE)
  const router = useRouter()

  // Whitelisted → refresh so the server re-reads the new cookie
  useEffect(() => {
    if (state.status === 'access_granted') {
      router.refresh()
    }
  }, [state.status, router])

  const submitted = state.status === 'waitlisted' || state.status === 'already_waitlisted'

  return (
    <div className="min-h-screen bg-lm-indigo flex flex-col">

      {/* ── Top bar ── */}
      <div className="px-8 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-lm-lime rounded-[7px] flex items-center justify-center">
            <span className="font-poppins font-black text-[0.9rem] text-lm-indigo">L</span>
          </div>
          <span className="font-poppins font-bold text-base text-white">Lameda</span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[480px] text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-lm-lime/10 border border-lm-lime/30 text-lm-lime text-[0.78rem] font-bold px-3.5 py-1.5 rounded-full tracking-[0.06em] uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-lm-lime animate-pulse inline-block" />
            Coming soon
          </div>

          <h1 className="font-poppins text-[2.6rem] font-black text-white leading-[1.1] mb-5">
            Your store.<br />
            Inside Telegram.<br />
            <span className="text-lm-lime">Running itself.</span>
          </h1>

          <p className="text-[1rem] text-lm-lavender leading-[1.7] mb-10 max-w-[400px] mx-auto">
            Lameda turns your product catalogue into a bot that takes orders,
            verifies payments, and notifies you — 24/7, no staff needed.
          </p>

          {submitted ? (
            /* ── Success state ── */
            <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-7">
              <div className="text-3xl mb-3">
                {state.status === 'already_waitlisted' ? '✓' : '🎉'}
              </div>
              <p className="font-poppins text-[1rem] font-bold text-white mb-1.5">
                {state.status === 'already_waitlisted'
                  ? 'You are already on the list'
                  : 'You are on the list'}
              </p>
              <p className="text-[0.88rem] text-lm-lavender leading-[1.6]">
                {state.status === 'already_waitlisted'
                  ? 'We already have your email. You will hear from us before launch.'
                  : 'We will reach out with your early access invite before we go live.'}
              </p>
            </div>
          ) : state.status === 'access_granted' ? (
            /* ── Access granted loading state ── */
            <div className="bg-lm-lime/10 border border-lm-lime/30 rounded-2xl px-8 py-7">
              <p className="font-poppins text-[1rem] font-bold text-lm-lime mb-1">
                You are in. Loading your preview...
              </p>
            </div>
          ) : (
            /* ── Email form ── */
            <form action={formAction} className="flex flex-col sm:flex-row gap-3 max-w-[420px] mx-auto">
              <input
                type="email"
                name="email"
                required
                placeholder="your@email.com"
                className="flex-1 px-4 py-3.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-lm-muted-dark text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-lm-lime/50 focus:border-lm-lime/50"
              />
              <button
                type="submit"
                disabled={pending}
                className="px-6 py-3.5 bg-lm-lime text-lm-indigo text-[0.95rem] font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 whitespace-nowrap"
              >
                {pending ? 'Checking...' : 'Get early access'}
              </button>
            </form>
          )}

          {state.status === 'error' && (
            <p className="mt-3 text-[0.84rem] text-red-400">{state.message}</p>
          )}

          {!submitted && state.status !== 'access_granted' && (
            <p className="mt-4 text-[0.82rem] text-lm-muted-dark">
              No spam. Just your launch invite when we go live.
            </p>
          )}

          {/* Trust row */}
          <div className="flex items-center justify-center gap-4 mt-10 flex-wrap">
            <span className="text-[0.82rem] text-lm-muted-dark">🔒 Paystack payments</span>
            <span className="text-lm-indigo-mid">·</span>
            <span className="text-[0.82rem] text-lm-muted-dark">🇳🇬 NDPR Compliant</span>
            <span className="text-lm-indigo-mid">·</span>
            <span className="text-[0.82rem] text-lm-muted-dark">✓ CAC Registered</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-8 pb-8 flex items-center justify-between flex-wrap gap-3">
        <p className="text-[0.8rem] text-[#4a4870]">
          &copy; 2025 Lameda. Lagos, Nigeria.
        </p>
        <a
          href="/login"
          className="text-[0.82rem] text-lm-muted-dark hover:text-white transition-colors"
        >
          Already registered? Sign in &rarr;
        </a>
      </div>

    </div>
  )
}
