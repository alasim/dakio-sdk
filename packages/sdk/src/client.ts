import { DakioError } from './errors.ts'
import type {
  AccountCode, AccountOrder, Category, CheckoutInput, CheckoutOptions, CheckoutResult, Commerce, CouponCheck,
  LeadInput, ListQuery, Product, ProductPage, Quote, QuoteInput, Shipping, DeliveryZone, Store, TrackedOrder,
} from './types.ts'

export const DEFAULT_BASE_URL = 'https://dakio-api-production.up.railway.app/api/sdk/v1'
const KEY_RE = /^dk_(pub|sec)_(live|test)_[0-9A-Za-z]{24}$/

export interface DakioOptions {
  /** Your store's key from Dakio → Settings → Developers (`dk_pub_live_…` or `dk_pub_test_…`). */
  key: string
  /** Override the API address, e.g. `http://localhost:5001/api/sdk/v1` against a local Dakio. */
  baseUrl?: string
  /** A custom fetch (tests, or a runtime without a global one). */
  fetch?: typeof fetch
  /** Per-request timeout in ms. Default 15000. */
  timeoutMs?: number
  /**
   * Checkout, OTP, abandoned carts and "my orders" run in the BROWSER, so Dakio
   * sees the buyer's own IP for fake-order protection. On a server every buyer
   * would share your server's IP and get blocked after a few orders. Set
   * `'allow'` only for tests and scripts.
   */
  serverCheckout?: 'refuse' | 'allow'
}

export interface Dakio extends Commerce {
  mode: 'live'
  /** Which kind of key this client holds. Test keys never create real orders. */
  keyMode: 'live' | 'test'
  store: { get(): Promise<Store> }
  categories: { list(): Promise<Category[]> }
  products: {
    list(query?: ListQuery): Promise<ProductPage>
    /** Null when there's no such published product. */
    get(idOrSlug: string): Promise<Product | null>
  }
  shipping: {
    get(district: string): Promise<Shipping>
    zones(): Promise<{ currency: string; zones: { zone: DeliveryZone; districts: string[] | string; charge: number }[] }>
  }
  cart: { quote(input: QuoteInput): Promise<Quote> }
  coupons: { validate(input: { code: string; subtotal?: number }): Promise<CouponCheck> }
  checkout: {
    /** Never throws for a refusal: returns `{ status: 'ERROR', code, message }`. */
    create(input: CheckoutInput, options?: CheckoutOptions): Promise<CheckoutResult>
    verifyOtp(input: { sessionToken: string; otp: string }): Promise<CheckoutResult>
  }
  leads: { capture(input: LeadInput, options?: { keepalive?: boolean }): Promise<{ ok: boolean; skipped?: boolean; test?: boolean }> }
  account: {
    sendCode(phone: string): Promise<AccountCode>
    orders(input: { sessionToken: string; otp: string }): Promise<AccountOrder[]>
  }
  orders: {
    /** Null when no order has that number and phone. */
    track(input: { orderNumber: string; phone: string }): Promise<TrackedOrder | null>
  }
  visits: { ping(input: { sessionId: string; page?: string }): Promise<boolean> }
}

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

function newKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return 'k-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface RequestOptions {
  query?: Record<string, string | number | undefined | null>
  body?: unknown
  idempotencyKey?: string
  /** Retry network errors, 502/503/504 and an in-progress idempotent request. */
  retry?: boolean
  keepalive?: boolean
}

interface Answer<T> { status: number; data: T; raw: unknown }

export function createDakio(options: DakioOptions): Dakio {
  const key = typeof options?.key === 'string' ? options.key.trim() : ''
  const m = KEY_RE.exec(key)
  if (!m) throw new DakioError('INVALID_KEY', 'createDakio needs a Dakio key (dk_pub_live_… or dk_pub_test_…) from Dakio → Settings → Developers.')
  if (m[1] === 'sec' && isBrowser()) {
    throw new DakioError('SECRET_KEY_IN_BROWSER', 'This is a secret key. Never put it in browser code — use your dk_pub_ key here.')
  }
  const keyMode = m[2] as 'live' | 'test'
  const base = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  const doFetch: typeof fetch = options.fetch || ((...args) => fetch(...args))
  const timeoutMs = options.timeoutMs ?? 15000
  const serverCheckout = options.serverCheckout === 'allow'

  async function request<T>(method: 'GET' | 'POST', path: string, opts: RequestOptions = {}): Promise<Answer<T>> {
    const qs = opts.query
      ? Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
      : ''
    const url = base + path + (qs ? `?${qs}` : '')
    const headers: Record<string, string> = { 'Dakio-Key': key, Accept: 'application/json' }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey

    const attempts = opts.retry ? 3 : 1
    let lastError: DakioError | null = null
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await sleep(attempt === 1 ? 400 : 1200)
      let res: Response
      try {
        const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined
        res = await doFetch(url, {
          method, headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          keepalive: opts.keepalive || undefined,
          signal,
        })
      } catch (err) {
        lastError = new DakioError('NETWORK_ERROR', `Couldn't reach Dakio: ${(err as Error)?.message || 'network error'}`)
        continue
      }
      let json: { data?: T; error?: { code?: string; message?: string; productId?: string; attemptsLeft?: number } } | null = null
      try { json = await res.json() } catch { json = null }
      if (res.ok) return { status: res.status, data: (json?.data ?? (json as T)) as T, raw: json }

      const e = json?.error
      lastError = new DakioError(e?.code || `HTTP_${res.status}`, e?.message || `Dakio answered ${res.status}`, res.status, { productId: e?.productId, attemptsLeft: e?.attemptsLeft })
      const retryable = res.status >= 502 || (res.status === 409 && e?.code === 'IDEMPOTENCY_IN_PROGRESS')
      if (!retryable) break
    }
    throw lastError ?? new DakioError('NETWORK_ERROR', "Couldn't reach Dakio")
  }

  const get = async <T>(path: string, query?: RequestOptions['query']) => (await request<T>('GET', path, { query, retry: true })).data
  const orNull = async <T>(p: Promise<T>): Promise<T | null> => {
    try { return await p } catch (err) { if ((err as DakioError).code === 'NOT_FOUND') return null; throw err }
  }
  const browserOnly = (what: string) => {
    if (!serverCheckout && !isBrowser()) {
      throw new DakioError('CHECKOUT_MUST_RUN_IN_BROWSER', `${what} runs in the browser with a client key, so Dakio sees the buyer's IP. Call it from a client component (or pass serverCheckout: 'allow' in tests).`)
    }
  }

  async function checkoutCall(path: string, body: unknown, idempotencyKey: string, what: string): Promise<CheckoutResult> {
    try {
      browserOnly(what)
      const r = await request<Record<string, unknown>>('POST', path, { body, idempotencyKey, retry: true })
      const d = r.data
      if (r.status === 202) {
        return { status: 'OTP_REQUIRED', sessionToken: String(d.sessionToken), maskedPhone: String(d.maskedPhone), expiresAt: String(d.expiresAt), ...(d.test ? { test: true } : {}) }
      }
      return { status: 'PLACED', orderNumber: String(d.orderNumber), orderId: String(d.orderId), total: Number(d.total), ...(d.test ? { test: true } : {}) }
    } catch (err) {
      const e = err as DakioError
      return {
        status: 'ERROR', code: e.code || 'ERROR', message: e.message,
        ...(e.productId ? { productId: e.productId } : {}),
        ...(e.attemptsLeft != null ? { attemptsLeft: e.attemptsLeft } : {}),
      }
    }
  }

  return {
    mode: 'live',
    keyMode,
    store: { get: () => get<Store>('/store') },
    categories: { list: () => get<Category[]>('/categories') },
    products: {
      async list(query = {}) {
        // GET /products answers the page object itself: { data: [...], page, limit, total, totalPages }.
        const r = await request<Product[]>('GET', '/products', {
          retry: true,
          query: {
            category: query.category, search: query.search, page: query.page, limit: query.limit, sort: query.sort,
            ids: query.ids?.length ? query.ids.join(',') : undefined,
          },
        })
        return r.raw as ProductPage
      },
      get: (idOrSlug) => orNull(get<Product>(`/products/${encodeURIComponent(idOrSlug)}`)),
    },
    shipping: {
      async get(district) {
        const d = await get<{ zone: DeliveryZone; charge: number }>('/shipping', { district })
        return { charge: d.charge, zone: d.zone }
      },
      zones: () => get('/shipping'),
    },
    cart: {
      quote: async (input) => (await request<Quote>('POST', '/cart/quote', { body: input, retry: true })).data,
    },
    coupons: {
      validate: async (input) => (await request<CouponCheck>('POST', '/coupons/validate', { body: input, retry: true })).data,
    },
    checkout: {
      create: (input, opts = {}) => checkoutCall('/checkout', input, opts.idempotencyKey || newKey(), 'Checkout'),
      verifyOtp: (input) => checkoutCall('/checkout/verify-otp', input, newKey(), 'The checkout code'),
    },
    leads: {
      async capture(input, opts = {}) {
        browserOnly('Abandoned-cart capture')
        return (await request<{ ok: boolean; skipped?: boolean; test?: boolean }>('POST', '/leads', { body: input, keepalive: opts.keepalive })).data
      },
    },
    account: {
      async sendCode(phone) {
        browserOnly('"My orders"')
        return (await request<AccountCode>('POST', '/account/otp', { body: { phone } })).data
      },
      async orders(input) {
        browserOnly('"My orders"')
        return (await request<AccountOrder[]>('POST', '/account/orders', { body: input })).data
      },
    },
    orders: {
      track: (input) => orNull(get<TrackedOrder>('/orders/track', { orderNumber: input.orderNumber, phone: input.phone })),
    },
    visits: {
      async ping(input) {
        try {
          await request('POST', '/visits', { body: { sessionId: input.sessionId, page: input.page }, keepalive: true })
          return true
        } catch { return false }
      },
    },
  }
}
