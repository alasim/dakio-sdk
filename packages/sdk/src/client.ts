import { DakioError } from './errors.ts'
import type {
  AccountCode, AccountOrder, Buyer, Category, CheckoutInput, CheckoutOptions, CheckoutResult, Commerce, CouponCheck,
  LeadInput, ListQuery, Order, OrderPage, OrderQuery, Product, ProductPage, Quote, QuoteInput, Shipping, DeliveryZone,
  Store, TrackedOrder, WebhookEndpoint, WebhookEventType,
  ServiceList, Slots, BookingInput, Booking, BookingView, EnquiryInput,
  ProgramCard, ProgramDetail, EnrollInput, EnrollResult, LoginCode, StudentSession, StudentHome, StudentProgram,
  ProgressInput, ProgressResult,
} from './types.ts'

export const DEFAULT_BASE_URL = 'https://dakio-api-production.up.railway.app/api/sdk/v1'
const KEY_RE = /^dk_(pub|sec)_(live|test)_[0-9A-Za-z]{24}$/

export interface DakioOptions {
  /**
   * Your store's key from Dakio → Settings → Developers.
   * - `dk_pub_live_…` / `dk_pub_test_…`: a client key, for browser code (and catalog reads anywhere).
   * - `dk_sec_live_…` / `dk_sec_test_…`: a secret key, for your SERVER only — order reads,
   *   webhooks, and checkout from a server with the shopper's IP (`buyer`).
   */
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
  /** `pub`: a client key. `sec`: a secret key (server only). */
  keyKind: 'pub' | 'sec'
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
    verifyOtp(input: { sessionToken: string; otp: string }, options?: { buyer?: Buyer }): Promise<CheckoutResult>
  }
  leads: { capture(input: LeadInput, options?: { keepalive?: boolean; buyer?: Buyer }): Promise<{ ok: boolean; skipped?: boolean; test?: boolean }> }
  account: {
    sendCode(phone: string, options?: { buyer?: Buyer }): Promise<AccountCode>
    orders(input: { sessionToken: string; otp: string }, options?: { buyer?: Buyer }): Promise<AccountOrder[]>
  }
  orders: {
    /** Null when no order has that number and phone. Any key. */
    track(input: { orderNumber: string; phone: string }): Promise<TrackedOrder | null>
    /** The store's orders, newest first (or oldest change first with `updatedSince`). Secret key only. */
    list(query?: OrderQuery): Promise<OrderPage>
    /** One order by id or number. Null when there's none. Secret key only. */
    get(idOrNumber: string): Promise<Order | null>
  }
  /** The store's webhooks — the same list as Settings → Developers → Webhooks. Live secret key only. */
  webhooks: {
    list(): Promise<WebhookEndpoint[]>
    /** The answer carries the signing `secret`, this once. */
    create(input: { url: string; events: WebhookEventType[]; description?: string }): Promise<WebhookEndpoint>
    delete(id: string): Promise<void>
  }
  visits: { ping(input: { sessionId: string; page?: string }): Promise<boolean> }
  /** A service business's services, and whether it takes bookings online. */
  services: { list(): Promise<ServiceList> }
  bookings: {
    /** Free times (Dhaka) for a service: the day asked for, else the next open days. */
    slots(input: { service: string; date?: string }): Promise<Slots>
    /** Book a free time. Runs in the browser (a client key) or with `buyer` (a secret key). Refusals throw: `SLOT_TAKEN`, `BOOKING_OFF`, `INVALID_PHONE`… */
    create(input: BookingInput, options?: { buyer?: Buyer }): Promise<Booking>
    /** The booking behind a token from `create`. Null when there is none. */
    get(token: string): Promise<BookingView | null>
  }
  /** A lead from your own form: a contact and a deal in Dakio, like the store's enquiry form. */
  enquiries: { send(input: EnquiryInput): Promise<{ ok: boolean; contactId?: string; dealId?: string | null; newContact?: boolean; test?: boolean }> }
  /**
   * The coach's academy: programs on the website, enrolling, and the signed-in
   * student's lessons and progress. A student signs in with their phone and an
   * SMS code (`login.sendCode` → `login.verify`); pass the token you get as
   * `student` to the calls that need it.
   */
  academy: {
    programs: {
      list(): Promise<ProgramCard[]>
      /** Null when there's no such published program. Locked lessons carry no video. */
      get(idOrSlug: string): Promise<ProgramDetail | null>
    }
    /** Enroll. Signed in: pass `{ student }` and only `program`. Otherwise name + phone. */
    enroll(input: EnrollInput, options?: { student?: string | null; buyer?: Buyer }): Promise<EnrollResult>
    login: {
      sendCode(phone: string, options?: { buyer?: Buyer }): Promise<LoginCode>
      /** `name` names a phone Dakio has never seen. Wrong code: throws `OTP_INCORRECT` with `attemptsLeft`. */
      verify(input: { sessionToken: string; otp: string; name?: string }, options?: { buyer?: Buyer }): Promise<StudentSession>
    }
    logout(student: string): Promise<void>
    /** The student and their programs. Throws `STUDENT_SIGNED_OUT` (401) when the token has ended. */
    me(student: string): Promise<StudentHome>
    /** One program with every lesson. Throws `NOT_ENROLLED` (403) while their place is pending. */
    program(student: string, idOrSlug: string): Promise<StudentProgram>
    /** Save where they are in a lesson. 90% watched, or `completed: true`, finishes it. */
    progress(student: string, input: ProgressInput): Promise<ProgressResult>
  }
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
  buyer?: Buyer
  /** Retry network errors, 502/503/504 and an in-progress idempotent request. */
  retry?: boolean
  keepalive?: boolean
  /** A signed-in academy student's token (Dakio-Student). */
  student?: string | null
}

interface Answer<T> { status: number; data: T; raw: unknown }

export function createDakio(options: DakioOptions): Dakio {
  const key = typeof options?.key === 'string' ? options.key.trim() : ''
  const m = KEY_RE.exec(key)
  if (!m) throw new DakioError('INVALID_KEY', 'createDakio needs a Dakio key (dk_pub_live_… or dk_pub_test_…) from Dakio → Settings → Developers.')
  if (m[1] === 'sec' && isBrowser()) {
    throw new DakioError('SECRET_KEY_IN_BROWSER', 'This is a secret key. Never put it in browser code — use your dk_pub_ key here, and revoke this one in Dakio → Settings → Developers.')
  }
  const keyKind = m[1] as 'pub' | 'sec'
  const isSecret = keyKind === 'sec'
  const keyMode = m[2] as 'live' | 'test'
  const base = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  const doFetch: typeof fetch = options.fetch || ((...args) => fetch(...args))
  const timeoutMs = options.timeoutMs ?? 15000
  const serverCheckout = options.serverCheckout === 'allow'

  async function request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, opts: RequestOptions = {}): Promise<Answer<T>> {
    const qs = opts.query
      ? Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
      : ''
    const url = base + path + (qs ? `?${qs}` : '')
    const headers: Record<string, string> = { 'Dakio-Key': key, Accept: 'application/json' }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey
    if (opts.student) headers['Dakio-Student'] = String(opts.student)
    // Only a secret key may say who the shopper is; Dakio ignores it otherwise.
    if (isSecret && opts.buyer?.ip) {
      headers['Dakio-Buyer-Ip'] = String(opts.buyer.ip).split(',')[0].trim()
      if (opts.buyer.userAgent) headers['Dakio-Buyer-Agent'] = String(opts.buyer.userAgent).slice(0, 500)
    }

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
  /**
   * A shopper action (checkout, codes, abandoned carts). With a client key it
   * runs in the browser, so Dakio sees the shopper's own IP. With a secret key
   * it runs on your server and must say who the shopper is.
   */
  const shopperCall = (what: string, buyer: Buyer | undefined) => {
    if (isSecret) {
      if (!buyer?.ip) throw new DakioError('BUYER_IP_REQUIRED', `${what} from a server needs the shopper: pass { buyer: { ip, userAgent } } (in Next.js, from headers()).`)
      return
    }
    if (!serverCheckout && !isBrowser()) {
      throw new DakioError('CHECKOUT_MUST_RUN_IN_BROWSER', `${what} runs in the browser with a client key, so Dakio sees the buyer's IP. Call it from a client component, or from your server with a secret key and the buyer's IP.`)
    }
  }
  const secretOnly = (what: string) => {
    if (!isSecret) throw new DakioError('SECRET_KEY_REQUIRED', `${what} needs a secret key (dk_sec_…), used on your server.`, 403)
  }
  const isoDate = (d: string | Date | undefined) => (d instanceof Date ? d.toISOString() : d)

  async function checkoutCall(path: string, body: unknown, idempotencyKey: string, what: string, buyer?: Buyer): Promise<CheckoutResult> {
    try {
      shopperCall(what, buyer)
      const r = await request<Record<string, unknown>>('POST', path, { body, idempotencyKey, retry: true, buyer })
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
    keyKind,
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
      create: (input, opts = {}) => checkoutCall('/checkout', input, opts.idempotencyKey || newKey(), 'Checkout', opts.buyer),
      verifyOtp: (input, opts = {}) => checkoutCall('/checkout/verify-otp', input, newKey(), 'The checkout code', opts.buyer),
    },
    leads: {
      async capture(input, opts = {}) {
        shopperCall('Abandoned-cart capture', opts.buyer)
        return (await request<{ ok: boolean; skipped?: boolean; test?: boolean }>('POST', '/leads', { body: input, keepalive: opts.keepalive, buyer: opts.buyer })).data
      },
    },
    account: {
      async sendCode(phone, opts = {}) {
        shopperCall('"My orders"', opts.buyer)
        return (await request<AccountCode>('POST', '/account/otp', { body: { phone }, buyer: opts.buyer })).data
      },
      async orders(input, opts = {}) {
        shopperCall('"My orders"', opts.buyer)
        return (await request<AccountOrder[]>('POST', '/account/orders', { body: input, buyer: opts.buyer })).data
      },
    },
    orders: {
      track: (input) => orNull(get<TrackedOrder>('/orders/track', { orderNumber: input.orderNumber, phone: input.phone })),
      async list(query = {}) {
        secretOnly('orders.list')
        const r = await request<Order[]>('GET', '/orders', {
          retry: true,
          query: { page: query.page, limit: query.limit, createdSince: isoDate(query.createdSince), updatedSince: isoDate(query.updatedSince), phone: query.phone },
        })
        return r.raw as OrderPage
      },
      async get(idOrNumber) {
        secretOnly('orders.get')
        return orNull(get<Order>(`/orders/${encodeURIComponent(String(idOrNumber).replace(/^#/, ''))}`))
      },
    },
    webhooks: {
      async list() {
        secretOnly('webhooks.list')
        return get<WebhookEndpoint[]>('/webhooks')
      },
      async create(input) {
        secretOnly('webhooks.create')
        return (await request<WebhookEndpoint>('POST', '/webhooks', { body: input })).data
      },
      async delete(id) {
        secretOnly('webhooks.delete')
        await request('DELETE', `/webhooks/${encodeURIComponent(id)}`)
      },
    },
    visits: {
      async ping(input) {
        try {
          await request('POST', '/visits', { body: { sessionId: input.sessionId, page: input.page }, keepalive: true })
          return true
        } catch { return false }
      },
    },
    services: { list: () => get<ServiceList>('/services') },
    bookings: {
      slots: (input) => get<Slots>('/bookings/slots', { service: input.service, date: input.date }),
      async create(input, opts = {}) {
        shopperCall('Booking', opts.buyer)
        return (await request<Booking>('POST', '/bookings', { body: input, buyer: opts.buyer })).data
      },
      get: (token) => orNull(get<BookingView>(`/bookings/${encodeURIComponent(token)}`)),
    },
    enquiries: {
      send: async (input) => (await request<{ ok: boolean; contactId?: string; dealId?: string | null; newContact?: boolean; test?: boolean }>('POST', '/enquiries', { body: input })).data,
    },
    academy: {
      programs: {
        list: () => get<ProgramCard[]>('/academy/programs'),
        get: (idOrSlug) => orNull(get<ProgramDetail>(`/academy/programs/${encodeURIComponent(idOrSlug)}`)),
      },
      async enroll(input, opts = {}) {
        shopperCall('Enrolling', opts.buyer)
        return (await request<EnrollResult>('POST', '/academy/enroll', { body: input, student: opts.student, buyer: opts.buyer })).data
      },
      login: {
        async sendCode(phone, opts = {}) {
          shopperCall('Signing in', opts.buyer)
          return (await request<LoginCode>('POST', '/academy/login', { body: { phone }, buyer: opts.buyer })).data
        },
        async verify(input, opts = {}) {
          shopperCall('Signing in', opts.buyer)
          return (await request<StudentSession>('POST', '/academy/login/verify', { body: input, buyer: opts.buyer })).data
        },
      },
      async logout(student) {
        await request('POST', '/academy/logout', { body: {}, student })
      },
      me: async (student) => (await request<StudentHome>('GET', '/academy/me', { student, retry: true })).data,
      program: async (student, idOrSlug) => (await request<StudentProgram>('GET', `/academy/me/programs/${encodeURIComponent(idOrSlug)}`, { student, retry: true })).data,
      progress: async (student, input) => (await request<ProgressResult>('POST', '/academy/me/progress', { body: input, student, keepalive: true })).data,
    },
  }
}
