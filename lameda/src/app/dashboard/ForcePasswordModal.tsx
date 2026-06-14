'use client'

import { useActionState, useEffect, useState } from 'react'
import { changePassword } from './change-password/actions'

const INITIAL: { success: boolean; error?: string } = { success: false }

export function ForcePasswordModal() {
  const [state, formAction, pending] = useActionState(changePassword, INITIAL)
  const [dismissed, setDismissed] = useState(false)

  // Hide modal once password is changed successfully
  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => setDismissed(true), 1200)
      return () => clearTimeout(t)
    }
  }, [state.success])

  if (dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-100 p-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-900">Set your password</h2>
          <p className="mt-1 text-sm text-zinc-500">
            You&rsquo;re logged in with a temporary password. Choose a permanent one to
            continue.
          </p>
        </div>

        {state.success ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Password updated — welcome to your dashboard!
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="fpc-new" className="block text-xs font-medium text-zinc-700 mb-1">
                New password
              </label>
              <input
                id="fpc-new"
                name="new_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label htmlFor="fpc-confirm" className="block text-xs font-medium text-zinc-700 mb-1">
                Confirm password
              </label>
              <input
                id="fpc-confirm"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Repeat new password"
              />
            </div>

            {state.error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-zinc-900 text-white text-sm font-semibold py-2.5 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {pending ? 'Updating…' : 'Set password & continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
