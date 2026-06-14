'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generatePreviewToken,
  PREVIEW_COOKIE,
  PREVIEW_COOKIE_MAX_AGE,
} from '@/lib/preview/gate'

export type PreviewResult =
  | { status: 'access_granted' }
  | { status: 'waitlisted' }
  | { status: 'already_waitlisted' }
  | { status: 'error'; message: string }
  | { status: 'idle' }

export async function requestPreviewAccess(
  _prev: PreviewResult,
  formData: FormData,
): Promise<PreviewResult> {
  const raw = formData.get('email')?.toString().trim() ?? ''
  const email = raw.toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Please enter a valid email address.' }
  }

  const db = createAdminClient()

  // Check if this email is on the whitelist
  const { data: whitelisted } = await db
    .from('preview_whitelist')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (whitelisted) {
    const cookieStore = await cookies()
    cookieStore.set(PREVIEW_COOKIE, generatePreviewToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: PREVIEW_COOKIE_MAX_AGE,
      path: '/',
    })
    return { status: 'access_granted' }
  }

  // Not whitelisted — add to waitlist
  const { error } = await db.from('waitlist').insert({ email })

  if (error) {
    // Unique constraint violation → already on the list
    if (error.code === '23505') return { status: 'already_waitlisted' }
    return { status: 'error', message: 'Something went wrong. Please try again.' }
  }

  return { status: 'waitlisted' }
}
