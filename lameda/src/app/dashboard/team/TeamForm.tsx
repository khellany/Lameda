'use client'

import { useActionState } from 'react'
import { inviteStaff, deactivateStaff } from './actions'
import type { InviteResult } from './actions'
import { formatDate } from '../_ui'

const IDLE: InviteResult = { success: false }

interface Member {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

export function TeamForm({ members }: { members: Member[] }) {
  const [state, formAction, pending] = useActionState(inviteStaff, IDLE)
  const active = members.filter(m => m.isActive)
  const inactive = members.filter(m => !m.isActive)

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Team</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Invite sales reps who can view orders, customers, and handoffs.
        </p>
      </div>

      {/* ── Invite form ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="font-semibold text-zinc-900 mb-5">Invite a team member</h2>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="team-name" className="block text-xs font-medium text-zinc-700 mb-1">
              Full name
            </label>
            <input
              id="team-name"
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="e.g. Amara Obi"
            />
          </div>
          <div>
            <label htmlFor="team-email" className="block text-xs font-medium text-zinc-700 mb-1">
              Email address
            </label>
            <input
              id="team-email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="amara@yourbusiness.com"
            />
          </div>

          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-4 py-3 text-xs text-zinc-500 space-y-1">
            <p className="font-medium text-zinc-700">Sales rep access</p>
            <p>✓ View orders, customers, handoffs, analytics</p>
            <p>✗ Cannot access billing, broadcasts, referrals, settings, or team</p>
            <p>✗ Cannot reset their own password without admin approval</p>
          </div>

          {state.error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}
          {state.success && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
              Invite sent — they&apos;ll receive login details by email.
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 text-white text-sm font-semibold px-4 py-2 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {pending ? 'Sending invite…' : 'Send invite'}
          </button>
        </form>
      </div>

      {/* ── Active members ─────────────────────────────────── */}
      {active.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-50">
            <h2 className="font-semibold text-zinc-900">Active team members</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-400 border-b border-zinc-50">
                <th className="text-left px-6 py-3 font-medium">Name</th>
                <th className="text-left px-6 py-3 font-medium">Email</th>
                <th className="text-left px-6 py-3 font-medium">Added</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {active.map(m => (
                <tr key={m.id}>
                  <td className="px-6 py-3 font-medium text-zinc-900">{m.name}</td>
                  <td className="px-6 py-3 text-zinc-500">{m.email}</td>
                  <td className="px-6 py-3 text-zinc-400">{formatDate(m.createdAt)}</td>
                  <td className="px-6 py-3 text-right">
                    <DeactivateButton staffId={m.id} name={m.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Inactive members ───────────────────────────────── */}
      {inactive.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden opacity-60">
          <div className="px-6 py-4 border-b border-zinc-50">
            <h2 className="font-semibold text-zinc-500 text-sm">Removed members</h2>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-50">
              {inactive.map(m => (
                <tr key={m.id}>
                  <td className="px-6 py-3 text-zinc-400 line-through">{m.name}</td>
                  <td className="px-6 py-3 text-zinc-400">{m.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DeactivateButton({ staffId, name }: { staffId: string; name: string }) {
  async function handleClick() {
    if (!confirm(`Remove ${name} from your team? They will lose dashboard access immediately.`)) return
    await deactivateStaff(staffId)
    window.location.reload()
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs text-red-600 hover:text-red-800 transition-colors"
    >
      Remove
    </button>
  )
}
