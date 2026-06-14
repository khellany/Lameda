'use client'

import { useState, useActionState } from 'react'
import { replyToHandoff, resolveHandoff } from './actions'
import type { ReplyState, ResolveState } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HandoffMessage {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  createdAt: string
}

export interface HandoffData {
  id: string
  shortcode: string
  customerName: string
  intent: string
  lastMessageAt: string | null
  messages: HandoffMessage[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

function urgency(intent: string): { label: string; isUrgent: boolean } {
  if (intent.includes('customer_request')) return { label: 'Customer asked', isUrgent: true }
  return { label: 'Bot unsure', isUrgent: false }
}

// ─── Per-card reply form ──────────────────────────────────────────────────────

const REPLY_INIT: ReplyState = { success: false }
const RESOLVE_INIT: ResolveState = { success: false }

function HandoffCard({ h, defaultOpen }: { h: HandoffData; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [replyState, replyAction, replyPending] = useActionState(replyToHandoff, REPLY_INIT)
  const [resolveState, resolveAction] = useActionState(resolveHandoff, RESOLVE_INIT)
  const { label, isUrgent } = urgency(h.intent)

  if (resolveState.success) return null // card disappears on resolve

  return (
    <div
      className={`rounded-2xl overflow-hidden border shadow-sm transition-shadow duration-200
        ${open ? 'shadow-md border-lm-indigo/30' : 'border-zinc-200 hover:border-lm-indigo/20 hover:shadow-sm'}`}
    >
      {/* ── Card header — always visible ─────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-lm-indigo text-left
                   hover:bg-lm-indigo-mid transition-colors duration-150 group"
      >
        {/* Urgency dot */}
        <span
          className={`shrink-0 w-2.5 h-2.5 rounded-full ring-2 ring-lm-indigo
            ${isUrgent ? 'bg-lm-lime' : 'bg-amber-400'}`}
        />

        {/* Customer name + shortcode */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{h.customerName}</p>
          <p className="text-xs text-white/40 font-mono mt-0.5">#{h.shortcode}</p>
        </div>

        {/* Reason badge */}
        <span
          className={`hidden sm:inline-flex items-center gap-1 text-[0.72rem] font-medium
            px-2 py-0.5 rounded-full border shrink-0
            ${isUrgent
              ? 'bg-lm-lime/20 text-lm-lime border-lm-lime/30'
              : 'bg-amber-400/20 text-amber-300 border-amber-400/30'}`}
        >
          {isUrgent ? '🚨' : '⚠️'} {label}
        </span>

        {/* Time */}
        <span className="shrink-0 text-xs text-white/40 tabular-nums">
          {relativeTime(h.lastMessageAt)}
        </span>

        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`shrink-0 w-4 h-4 text-white/40 transition-transform duration-200
            ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd" />
        </svg>
      </button>

      {/* ── Expandable body ───────────────────────────────────────────────── */}
      {open && (
        <div className="bg-white">
          {/* Message thread */}
          <div className="px-5 py-4 space-y-3 max-h-64 overflow-y-auto border-b border-zinc-100">
            {h.messages.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-4">No messages yet in this conversation.</p>
            ) : (
              h.messages.map(m => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-snug
                      ${m.direction === 'outbound'
                        ? 'bg-lm-indigo text-white rounded-br-sm'
                        : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'}`}
                  >
                    {m.content}
                    <p className={`text-[0.65rem] mt-1 tabular-nums
                      ${m.direction === 'outbound' ? 'text-white/50' : 'text-zinc-400'}`}>
                      {relativeTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply form */}
          <div className="px-5 py-4">
            {replyState.success && replyState.conversationId === h.id ? (
              <p className="text-sm text-emerald-600 font-medium flex items-center gap-2 py-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Message sent to customer.
              </p>
            ) : (
              <form action={replyAction} className="flex flex-col gap-2">
                <input type="hidden" name="conversationId" value={h.id} />
                <textarea
                  name="reply"
                  rows={2}
                  placeholder="Type your reply to the customer…"
                  className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm
                             text-zinc-800 placeholder-zinc-400 outline-none
                             focus:border-lm-indigo/50 focus:ring-2 focus:ring-lm-indigo/10
                             transition-all duration-150 bg-zinc-50"
                />
                {replyState.error && replyState.conversationId === h.id && (
                  <p className="text-xs text-red-600">{replyState.error}</p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <form action={resolveAction}>
                    <input type="hidden" name="conversationId" value={h.id} />
                    <button
                      type="submit"
                      className="text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-2 transition-colors"
                    >
                      Mark resolved
                    </button>
                  </form>
                  <button
                    type="submit"
                    disabled={replyPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                               bg-lm-lime text-lm-indigo hover:brightness-105
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-150 active:scale-95"
                  >
                    {replyPending ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        Send
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function HandoffsClient({ handoffs }: { handoffs: HandoffData[] }) {
  if (handoffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-lm-indigo/5 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="w-6 h-6 text-lm-indigo/40">
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <p className="font-semibold text-lm-indigo">All clear</p>
        <p className="mt-1 text-sm text-zinc-400">No open handoffs — the bot is handling everything.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {handoffs.map((h, i) => (
        <HandoffCard key={h.id} h={h} defaultOpen={i === 0} />
      ))}
    </div>
  )
}
