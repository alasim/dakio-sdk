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
 *   // app/api/dakio/revalidate/route.ts — pages refresh the moment a product changes
 *   export const POST = createRevalidateRoute({ secret: process.env.DAKIO_WEBHOOK_SECRET!, revalidatePath, revalidateTag })
 */
import type { Commerce, Product, Store } from '../types.ts'
import { verifyWebhook, type WebhookEvent } from '../webhooks/index.ts'

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

export interface RevalidateTargets {
  /** Paths to refresh, as `revalidatePath(path)` takes them. `'/'` with type `'layout'` refreshes everything. */
  paths: (string | { path: string; type: 'page' | 'layout' })[]
  /** Cache tags, if your own fetches use them. */
  tags?: string[]
}

/**
 * What a change refreshes by default, with the routes `dakioSitemap` assumes
 * (`/p/<slug>`, `/shop`, home). A store change (name, delivery rates, a sale
 * banner — sale prices too) refreshes every page.
 */
export function defaultRevalidateTargets(event: WebhookEvent, options: { productPath?: (slug: string) => string } = {}): RevalidateTargets {
  const productPath = options.productPath || ((slug: string) => `/p/${slug}`)
  switch (event.type) {
    case 'product.updated':
    case 'product.deleted':
      return {
        paths: [...(event.data.slug ? [productPath(event.data.slug)] : []), { path: '/shop', type: 'layout' }, '/'],
        tags: ['dakio:products', `dakio:product:${event.data.id}`],
      }
    case 'stock.changed':
      return { paths: [productPath(event.data.slug), { path: '/shop', type: 'layout' }], tags: ['dakio:products', `dakio:product:${event.data.productId}`] }
    case 'store.updated':
      return { paths: [{ path: '/', type: 'layout' }], tags: ['dakio'] }
    default:
      return { paths: [] }
  }
}

/**
 * A Next.js route handler for Dakio webhooks that refreshes the pages a change
 * touches — so an edited price shows on the product page in seconds instead of
 * at the next timed revalidation. Point a webhook (Settings → Developers →
 * Webhooks, events product.*, stock.changed, store.updated) at it.
 *
 *   // app/api/dakio/revalidate/route.ts
 *   import { revalidatePath, revalidateTag } from 'next/cache'
 *   import { createRevalidateRoute } from '@dakio/sdk/next'
 *   export const POST = createRevalidateRoute({ secret: process.env.DAKIO_WEBHOOK_SECRET!, revalidatePath, revalidateTag })
 *
 * `revalidatePath` / `revalidateTag` are passed in, so this module never
 * imports Next itself. `targets(event)` overrides what gets refreshed;
 * `onEvent(event)` runs for every verified event (orders too).
 */
export function createRevalidateRoute(options: {
  secret: string
  revalidatePath: (path: string, type?: 'page' | 'layout') => void
  revalidateTag?: (tag: string, profile?: any) => void
  targets?: (event: WebhookEvent) => RevalidateTargets
  productPath?: (slug: string) => string
  onEvent?: (event: WebhookEvent) => void | Promise<void>
}): (req: Request) => Promise<Response> {
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  return async function POST(req: Request): Promise<Response> {
    const body = await req.text()
    let event: WebhookEvent
    try {
      event = await verifyWebhook({ body, signature: req.headers.get('dakio-signature'), secret: options.secret })
    } catch (err) {
      return json({ ok: false, error: (err as Error).message }, 400)
    }
    const t = options.targets ? options.targets(event) : defaultRevalidateTargets(event, { productPath: options.productPath })
    const paths: string[] = []
    for (const p of t.paths) {
      if (typeof p === 'string') { options.revalidatePath(p); paths.push(p) }
      else { options.revalidatePath(p.path, p.type); paths.push(`${p.path} (${p.type})`) }
    }
    // 'max': serve stale while refetching (Next 16's recommended profile; older Next ignores it).
    if (options.revalidateTag) for (const tag of t.tags || []) options.revalidateTag(tag, 'max')
    if (options.onEvent) await options.onEvent(event)
    return json({ ok: true, type: event.type, revalidated: paths })
  }
}
