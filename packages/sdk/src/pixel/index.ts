/**
 * Meta Pixel helpers. Dakio already sends the server side of Purchase, Lead
 * and InitiateCheckout (Conversions API) for every store with a Pixel. Send
 * the browser side with the SAME event id and Meta counts each once:
 *
 *   const eventId = newEventId()
 *   trackPixel('Purchase', purchaseParams(quote), eventId)
 *   await dakio.checkout.create({ ...input, eventId })       // server event, same id
 *
 *   dakio.leads.capture({ ...lead, leadEventId, checkoutEventId })   // Lead / InitiateCheckout
 *
 * `loadPixel(store.tracking.metaPixelId)` injects Meta's base code once.
 * Everything here is a no-op on the server or without a Pixel.
 */
import type { Product, Quote } from '../types.ts'

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq; dataLayer?: unknown[] }
}

const inBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

export type PixelEvent = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Lead' | 'Purchase' | (string & {})

/** A fresh id for one event, shared by the browser Pixel and Dakio's server event. */
export function newEventId(prefix = 'ev'): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  const rand = c?.randomUUID ? c.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}_${rand}`
}

/** Inject Meta's Pixel base code and send PageView. Safe to call more than once. */
export function loadPixel(pixelId: string | null | undefined): void {
  if (!pixelId || !inBrowser()) return
  if (!window.fbq) {
    const fbq: Fbq = function (...args: unknown[]) {
      fbq.callMethod ? fbq.callMethod(...args) : fbq.queue!.push(args)
    } as Fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(s)
  }
  const loaded = (window as unknown as { __dakioPixels?: Set<string> }).__dakioPixels ||= new Set<string>()
  if (loaded.has(pixelId)) return
  loaded.add(pixelId)
  window.fbq!('init', pixelId)
  window.fbq!('track', 'PageView')
}

/** Send one Pixel event (and push it to `dataLayer` for GTM). */
export function trackPixel(event: PixelEvent, params: Record<string, unknown> = {}, eventId?: string): void {
  if (!inBrowser()) return
  window.fbq?.('track', event, params, eventId ? { eventID: eventId } : undefined)
  window.dataLayer?.push({ event: `dakio_${event}`, ...params, ...(eventId ? { eventId } : {}) })
}

/** ViewContent / AddToCart parameters for a product. */
export function productParams(product: Pick<Product, 'id' | 'name' | 'price'>, qty = 1, currency = 'BDT') {
  return { content_ids: [product.id], content_name: product.name, content_type: 'product', value: product.price * qty, currency, num_items: qty }
}

/** InitiateCheckout / Purchase parameters for a priced cart. */
export function purchaseParams(quote: Pick<Quote, 'lines' | 'total' | 'currency'>) {
  const lines = quote.lines.filter((l) => !l.problem)
  return {
    content_ids: lines.map((l) => l.productId),
    contents: lines.map((l) => ({ id: l.productId, quantity: l.qty, item_price: l.unitPrice })),
    content_type: 'product',
    num_items: lines.reduce((s, l) => s + l.qty, 0),
    value: quote.total,
    currency: quote.currency || 'BDT',
  }
}
