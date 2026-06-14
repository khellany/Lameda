'use client'

import { useActionState } from 'react'
import { updateProfile, updateStaffProfile, changePassword } from './actions'
import type { DashboardRole } from '@/lib/crm/session'

const IDLE = { success: false }

interface AdminProps {
  role: 'admin'
  businessName: string
  ownerName: string
  email: string
  whatsappNumber: string
  pickupAddress: string
  botPersonality: string
  businessType: string
  apiKey: string
  referralCode: string
}

interface StaffProps {
  role: 'sales_rep'
  staffName: string
  email: string
}

type Props = AdminProps | StaffProps

export function ProfileForm(props: Props) {
  const [profileState, profileAction, profilePending] = useActionState(
    props.role === 'admin' ? updateProfile : updateStaffProfile,
    IDLE,
  )
  const [pwState, pwAction, pwPending] = useActionState(changePassword, IDLE)

  const isAdmin = props.role === 'admin'

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account details.</p>
      </div>

      {/* ── Account details ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="font-semibold text-zinc-900 mb-5">Account details</h2>

        <form action={profileAction} className="space-y-4">
          {/* Read-only email */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Email (login)</label>
            <input
              readOnly
              value={props.email}
              className="w-full rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 cursor-not-allowed"
            />
            <p className="text-xs text-zinc-400 mt-1">Email cannot be changed.</p>
          </div>

          {isAdmin ? (
            <>
              <div>
                <label htmlFor="business_name" className="block text-xs font-medium text-zinc-700 mb-1">
                  Business name
                </label>
                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  defaultValue={(props as AdminProps).businessName}
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="owner_name" className="block text-xs font-medium text-zinc-700 mb-1">
                  Owner name
                </label>
                <input
                  id="owner_name"
                  name="owner_name"
                  type="text"
                  defaultValue={(props as AdminProps).ownerName}
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="whatsapp_number" className="block text-xs font-medium text-zinc-700 mb-1">
                  WhatsApp number <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  id="whatsapp_number"
                  name="whatsapp_number"
                  type="tel"
                  defaultValue={(props as AdminProps).whatsappNumber}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="pickup_address" className="block text-xs font-medium text-zinc-700 mb-1">
                  Pickup address <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  id="pickup_address"
                  name="pickup_address"
                  type="text"
                  defaultValue={(props as AdminProps).pickupAddress}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label htmlFor="bot_personality" className="block text-xs font-medium text-zinc-700 mb-1">
                  Bot personality <span className="text-zinc-400">(optional — overrides AI tone)</span>
                </label>
                <textarea
                  id="bot_personality"
                  name="bot_personality"
                  rows={3}
                  defaultValue={(props as AdminProps).botPersonality}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-zinc-700 mb-1">
                Your name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={(props as StaffProps).staffName}
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          )}

          {profileState.error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{profileState.error}</p>
          )}
          {profileState.success && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">Changes saved.</p>
          )}

          <button
            type="submit"
            disabled={profilePending}
            className="rounded-lg bg-zinc-900 text-white text-sm font-semibold px-4 py-2 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {profilePending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* ── Read-only credentials (admin only) ──────────────── */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Credentials</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-baseline gap-3">
              <span className="text-xs text-zinc-500 w-28 shrink-0">API Key</span>
              <code className="font-mono text-xs text-zinc-700 break-all">{(props as AdminProps).apiKey}</code>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-xs text-zinc-500 w-28 shrink-0">Referral code</span>
              <code className="font-mono text-xs text-zinc-700">{(props as AdminProps).referralCode}</code>
            </div>
          </div>
        </div>
      )}

      {/* ── Password ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <h2 className="font-semibold text-zinc-900 mb-1">Change password</h2>
        {!isAdmin ? (
          <p className="text-sm text-zinc-500 mt-1">
            To reset your password, contact your account admin.
          </p>
        ) : (
          <form action={pwAction} className="space-y-4 mt-4">
            <div>
              <label htmlFor="new_password" className="block text-xs font-medium text-zinc-700 mb-1">
                New password
              </label>
              <input
                id="new_password"
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
              <label htmlFor="confirm_password" className="block text-xs font-medium text-zinc-700 mb-1">
                Confirm password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            {pwState.error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{pwState.error}</p>
            )}
            {pwState.success && (
              <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">Password updated.</p>
            )}
            <button
              type="submit"
              disabled={pwPending}
              className="rounded-lg bg-zinc-900 text-white text-sm font-semibold px-4 py-2 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {pwPending ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
