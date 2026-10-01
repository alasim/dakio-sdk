/**
 * SEO helpers for a Next.js (App Router) store. They return plain objects in
 * Next's shapes, so this module doesn't import Next itself.
 *
 *   // app/sitemap.ts
 *   export default () => dakioSitemap(dakio, { baseUrl: 'https://mybrand.com.bd' })
 *   // app/robots.ts
 *   export default () => dakioRobots({ baseUrl: 'https://mybrand.com.bd' })
 *   // app/p/[slug]/page.tsx
 *   export async function generateMetadata({ params }) { … return productMetadata(product, store, { url }) }
 *   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, store, { url })) }} />
 */
import type { Commerce, Product, Store } from '../types.ts'

export interface SitemapEntry {
  url: string
  lastModified?: string | Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

const trimSlash = (s: string) => s.replace(/\/+$/, '')

/**
 * Home, shop, every category and every published product (paged through,
 * up to `maxProducts`). Paths are yours: pass `productPath` / `categoryPath`
 * if your routes differ from `/p/<slug>` and `/shop/<category-slug>`.
 */
export async function dakioSitemap(
  dakio: Pick<Commerce, 'products' | 'categories'>,
  options: {
    baseUrl: string
    productPath?: (p: Product) => string
    categoryPath?: (c: { slug: string }) => string
    extraPaths?: string[]
    maxProducts?: number
  },
): Promise<SitemapEntry[]> {
  const base = trimSlash(options.baseUrl)
  const productPath = options.productPath || ((p) => `/p/${p.slug}`)
  const categoryPath = options.categoryPath || ((c) => `/shop/${c.slug}`)
  const max = options.maxProducts ?? 5000
  const out: SitemapEntry[] = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.8 },
    ...(options.extraPaths || []).map((p) => ({ url: base + p, changeFrequency: 'weekly' as const, priority: 0.5 })),
  ]
  const categories = await dakio.categories.list()
  for (const c of categories) if (c.productCount > 0) out.push({ url: base + categoryPath(c), changeFrequency: 'daily', priority: 0.7 })
  for (let page = 1, seen = 0; seen < max; page++) {
    const r = await dakio.products.list({ page, limit: 100, sort: 'newest' })
    for (const p of r.data) out.push({ url: base + productPath(p), lastModified: p.createdAt, changeFrequency: 'weekly', priority: 0.6 })
    seen += r.data.length
    if (page >= r.totalPages || r.data.length === 0) break
  }
  return out
}

/** robots.txt as Next's MetadataRoute.Robots. `noindex: true` for a staging site. */
export function dakioRobots(options: { baseUrl: string; noindex?: boolean; disallow?: string[] }) {
  const base = trimSlash(options.baseUrl)
  if (options.noindex) return { rules: [{ userAgent: '*', disallow: '/' }] }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: options.disallow ?? ['/checkout', '/cart', '/account', '/track'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}

const plain = (html: string | null | undefined, max = 300) =>
  String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, max)

/** schema.org Product for Google rich results. */
export function productJsonLd(product: Product, store: Pick<Store, 'name' | 'currency'>, options: { url: string }) {
  const prices = [product.price, ...product.variants.map((v) => v.price)].filter((n) => Number.isFinite(n))
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  const availability = product.stock.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  const offers = low !== high && !product.onSale
    ? { '@type': 'AggregateOffer', priceCurrency: store.currency || 'BDT', lowPrice: low, highPrice: high, offerCount: product.variants.length || 1, availability, url: options.url }
    : { '@type': 'Offer', priceCurrency: store.currency || 'BDT', price: product.price, availability, url: options.url, itemCondition: 'https://schema.org/NewCondition' }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.images.length ? { image: product.images } : {}),
    ...(product.shortDescription || product.description ? { description: plain(product.shortDescription || product.description, 5000) } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.category ? { category: product.category.name } : {}),
    brand: { '@type': 'Brand', name: store.name },
    offers,
  }
}

/** JSON for a `<script type="application/ld+json">`, with `<` escaped so it can't close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** Next.js Metadata for a product page: title, description, canonical, Open Graph. */
export function productMetadata(product: Product, store: Pick<Store, 'name'>, options: { url: string }) {
  const description = plain(product.shortDescription || product.description, 160) || `${product.name} — ${store.name}`
  return {
    // `absolute`: a layout's title template must not add the store name twice.
    title: { absolute: `${product.name} | ${store.name}` },
    description,
    alternates: { canonical: options.url },
    openGraph: {
      type: 'website',
      url: options.url,
      title: product.name,
      description,
      siteName: store.name,
      ...(product.images[0] ? { images: [{ url: product.images[0] }] } : {}),
    },
  }
}
