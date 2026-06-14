import { NextRequest, NextResponse } from 'next/server'
import { verifyPreviewToken, PREVIEW_COOKIE } from '@/lib/preview/gate'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /onboard: only whitelisted users (those with the preview cookie) can register
  if (pathname.startsWith('/onboard')) {
    const token = request.cookies.get(PREVIEW_COOKIE)?.value
    const hasAccess = token ? verifyPreviewToken(token) : false
    if (!hasAccess) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  // Run only on /onboard routes; skip static assets, API, auth, and dashboard
  matcher: ['/onboard', '/onboard/:path*'],
}
