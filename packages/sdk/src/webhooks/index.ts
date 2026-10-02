/**
 * Webhooks from Dakio — check that a delivery really came from Dakio before
 * acting on it. Runs on your server: Node 18+, Next.js route handlers (Node or
 * Edge), Cloudflare Workers, Bun, Deno. Uses Web Crypto, no dependencies.
 *
 *   import { verifyWebhook } from '@dakio/sdk/webhooks'
 *
 *   export async function POST(req: Request) {
 *     const event = await verifyWebhook({
 *       body: await req.text(),                         // the RAW body, not parsed JSON
 *       signature: req.headers.get('dakio-signature'),
 *       secret: process.env.DAKIO_WEBHOOK_SECRET!,      // whsec_… from Settings → Developers → Webhooks
 *     })
 *     if (event.type === 'order.created') { … event.data.order … }
 *     return new Response('ok')
 *   }
 *
 * Every delivery is a POST with `Dakio-Signature: t=<unix seconds>,v1=<hex>`
 * where v1 = HMAC-SHA256(secret, `${t}.${body}`). Answer 2xx within 10 s;
 * anything else is retried for 24 hours, so handlers must tolerate seeing an
 * event twice (use `event.id`). Events can arrive out of order.
 */
import { DakioError } from '../errors.ts'
import type { Order, OrderStatus, Product, Store, WebhookEventType } from '../types.ts'

export type { WebhookEventType } from '../types.ts'

export const WEBHOOK_EVENTS: readonly WebhookEventType[] = [
  'product.updated', 'product.deleted', 'stock.changed', 'order.created', 'order.status_changed', 'store.updated',
]

interface EventBase<T extends string, D> {
  /** `evt_…` — the same for every endpoint that hears this event; dedupe on it. */
  id: string
  type: T
  createdAt: string
  storeId: string
  data: D
}

export type WebhookEvent =
  /** Created or changed. `product` is what GET /products/:id answers now — null when it isn't published. */
  | EventBase<'product.updated', { id: string; slug: string; published: boolean; product: Product | null }>
  | EventBase<'product.deleted', { id: string; slug: string | null; published: false; product: null }>
  | EventBase<'stock.changed', { productId: string; variantId: string | null; slug: string; stock: number; inStock: boolean; productStock: number }>
  | EventBase<'order.created', { order: Order }>
  | EventBase<'order.status_changed', { from: OrderStatus; to: OrderStatus; order: Order }>
  | EventBase<'store.updated', { store: Store }>
  /** "Send test" in Settings → Developers. */
  | EventBase<'ping', { message: string }>

const enc = new TextEncoder()

async function subtle(): Promise<SubtleCrypto> {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c?.subtle) return c.subtle
  // Node 18 has Web Crypto, just not on globalThis. The name is a variable so
  // Edge / browser bundlers don't try to resolve a Node module they can't use.
  const name = 'node:crypto'
  const node = await import(/* webpackIgnore: true */ /* @vite-ignore */ name) as { webcrypto: Crypto }
  return node.webcrypto.subtle
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const s = await subtle()
  const key = await s.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await s.sign('HMAC', key, enc.encode(message)))
  let hex = ''
  for (const b of sig) hex += b.toString(16).padStart(2, '0')
  return hex
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** The `Dakio-Signature` header for a body — for testing your handler locally. */
export async function signWebhook(body: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
  return `t=${timestamp},v1=${await hmacHex(secret, `${timestamp}.${body}`)}`
}

export interface VerifyWebhookInput {
  /** The raw request body exactly as received (`await req.text()`). Parsed-and-restringified JSON won't match. */
  body: string
  /** The `Dakio-Signature` header. */
  signature: string | null | undefined
  /** The endpoint's signing secret (`whsec_…`). */
  secret: string
  /** Reject deliveries signed longer ago than this (replays). Default 300 s. */
  toleranceSec?: number
  /** For tests. */
  now?: number
}

/**
 * Checks the signature and the timestamp, then returns the parsed event.
 * Throws `DakioError` `WEBHOOK_SIGNATURE_INVALID` (answer 400) otherwise.
 */
export async function verifyWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
  const { body, signature, secret } = input
  const fail = (why: string): never => { throw new DakioError('WEBHOOK_SIGNATURE_INVALID', `Not a valid Dakio webhook: ${why}`, 400) }
  if (!secret) fail('no signing secret configured')
  if (typeof body !== 'string') fail('pass the raw body as a string')
  const parts: Record<string, string> = {}
  for (const p of String(signature || '').split(',')) {
    const i = p.indexOf('=')
    if (i > 0) parts[p.slice(0, i).trim()] = p.slice(i + 1).trim()
  }
  const t = Number(parts.t)
  if (!Number.isInteger(t) || !parts.v1) fail('missing or malformed Dakio-Signature header')
  const now = input.now ?? Date.now()
  if (Math.abs(now / 1000 - t) > (input.toleranceSec ?? 300)) fail('signed too long ago (or the server clock is off)')
  if (!safeEqual(await hmacHex(secret, `${t}.${body}`), parts.v1.toLowerCase())) fail('signature does not match — wrong secret, or the body was changed')
  try {
    return JSON.parse(body) as WebhookEvent
  } catch {
    return fail('body is not JSON')
  }
}
