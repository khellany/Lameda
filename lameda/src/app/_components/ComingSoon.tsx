'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { requestPreviewAccess, type PreviewResult } from '@/app/actions/preview-gate'

const IDLE: PreviewResult = { status: 'idle' }

export function ComingSoon() {
  const [state, formAction, pending] = useActionState(requestPreviewAccess, IDLE)
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'access_granted') {
      router.refresh()
    }
  }, [state.status, router])

  const submitted = state.status === 'waitlisted' || state.status === 'already_waitlisted'

  return (
    <div className="min-h-screen bg-lm-indigo flex flex-col lg:flex-row">

      {/* Left panel */}
      <div className="flex flex-col px-8 py-10 lg:px-16 lg:py-12 lg:w-[56%] lg:min-h-screen">

        {/* Nav */}
        <nav className="flex items-center justify-between mb-14 lg:mb-20">
          <div className="flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] bg-lm-lime rounded-[7px] flex items-center justify-center">
              <span className="font-poppins font-black text-[0.9rem] text-lm-indigo">L</span>
            </div>
            <span className="font-poppins font-bold text-base text-white">Lameda</span>
          </div>
          <a
            href="/login"
            className="text-[0.85rem] text-lm-muted-dark hover:text-white transition-colors"
          >
            Sign in
          </a>
        </nav>

        {/* Hero */}
        <div className="flex-1">
          <p className="text-lm-lime text-[0.75rem] font-bold tracking-[0.14em] uppercase mb-6">
            Launching soon
          </p>

          <h1 className="font-poppins text-[2.6rem] lg:text-[3.1rem] font-black text-white leading-[1.08] mb-7">
            Orders processed.<br />
            Leads converted.<br />
            <span className="text-lm-lime">Your store never sleeps.</span>
          </h1>

          <p className="text-[1rem] text-lm-lavender leading-[1.85] mb-10 max-w-[420px]">
            Lameda gives your business an automated bot that captures leads, processes orders,
            confirms payments, and notifies you in real time. No staff. No missed sales.
          </p>

          {submitted ? (
            <div className="border-l-[3px] border-lm-lime pl-5 mb-10">
              <p className="font-poppins text-[1rem] font-semibold text-white mb-1.5">
                {state.status === 'already_waitlisted'
                  ? 'You are already on the list.'
                  : 'You are on the list.'}
              </p>
              <p className="text-[0.9rem] text-lm-lavender leading-[1.7]">
                {state.status === 'already_waitlisted'
                  ? 'We already have your email and will reach out before launch.'
                  : 'We will send your early access invite before we go live.'}
              </p>
            </div>
          ) : state.status === 'access_granted' ? (
            <div className="border-l-[3px] border-lm-lime pl-5 mb-10">
              <p className="font-poppins text-[1rem] font-semibold text-lm-lime">
                Access granted. Loading your preview...
              </p>
            </div>
          ) : (
            <div className="mb-10">
              <p className="text-[0.82rem] text-lm-muted-dark mb-3 tracking-wide">
                Request early access
              </p>
              <form action={formAction} className="flex flex-col sm:flex-row gap-3 max-w-[420px]">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-lg bg-white/8 border border-white/15 text-white placeholder:text-lm-muted-dark text-[0.95rem] focus:outline-none focus:border-lm-lime/50 focus:ring-1 focus:ring-lm-lime/30"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="px-5 py-3 bg-lm-lime text-lm-indigo text-[0.92rem] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 whitespace-nowrap"
                >
                  {pending ? 'Checking...' : 'Request access'}
                </button>
              </form>
              {state.status === 'error' && (
                <p className="mt-2.5 text-[0.84rem] text-red-400">{state.message}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span className="text-[0.82rem] text-lm-muted-dark">Paystack secured</span>
            <span className="text-[0.82rem] text-lm-muted-dark">NDPR compliant</span>
            <span className="text-[0.82rem] text-lm-muted-dark">CAC registered</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-white/8">
          <p className="text-[0.8rem] text-[#4a4870]">
            &copy; 2025 Lameda Technologies Ltd. Lagos, Nigeria.
          </p>
        </div>
      </div>

      {/* Right panel: photo */}
      <div className="hidden lg:block lg:w-[44%] relative">
        <Image
          src="https://images.unsplash.com/photo-1596558450268-9c27524ba856?w=1200&q=85&auto=format&fit=crop"
          alt="Nigerian store owner managing orders on a phone"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-lm-indigo via-lm-indigo/30 to-transparent" />
      </div>

    </div>
  )
}
