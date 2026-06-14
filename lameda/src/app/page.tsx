import { cookies } from 'next/headers'
import { verifyPreviewToken, PREVIEW_COOKIE } from '@/lib/preview/gate'
import { MarketingPage } from './_components/MarketingPage'
import { ComingSoon } from './_components/ComingSoon'

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(PREVIEW_COOKIE)?.value
  const hasAccess = token ? verifyPreviewToken(token) : false

  if (hasAccess) return <MarketingPage />
  return <ComingSoon />
}
