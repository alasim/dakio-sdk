import { dakioRobots } from '@dakio/sdk/next'
import { siteUrl } from '@/lib/dakio'

export default function robots() {
  // A preview/staging deploy on *.vercel.app stays out of Google.
  return dakioRobots({ baseUrl: siteUrl, noindex: process.env.VERCEL_ENV === 'preview' })
}
