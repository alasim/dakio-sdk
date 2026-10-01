import { dakioSitemap } from '@dakio/sdk/next'
import { dakio, siteUrl } from '@/lib/dakio'

export const revalidate = 3600

export default function sitemap() {
  return dakioSitemap(dakio, { baseUrl: siteUrl })
}
