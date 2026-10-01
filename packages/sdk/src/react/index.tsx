/**
 * React for a Dakio store (client components).
 *
 *   <CartProvider dakio={dakio}>…</CartProvider>
 *   const cart = useCart()                 // lines, add, setQty, quote (priced by Dakio), coupon, district
 *   const checkout = useCheckout(dakio)    // submit → OTP if Dakio asks → placed
 *   useAbandonedCart(dakio, { name, phone, items })   // Incomplete Orders + Nova follow-up
 *   useVisitPing(dakio, pathname)          // the merchant's live-visitors count
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createCartStore, type CartStore } from '../cart.ts'
import type { Dakio } from '../client.ts'
import type { CartLine, CheckoutInput, CheckoutResult, Quote, QuoteInput } from '../types.ts'

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartContextValue {
  lines: CartLine[]
  count: number
  /** False until the saved bag has been read. */
  ready: boolean
  add(line: { productId: string; variantId?: string | null; qty?: number }): void
  setQty(productId: string, variantId: string | null, qty: number): void
  remove(productId: string, variantId: string | null): void
  clear(): void
  /** A cart drawer's open state, for convenience. */
  isOpen: boolean
  open(): void
  close(): void
  /** The bag priced by Dakio: lines, problems, coupon, delivery, total. Null for an empty bag. */
  quote: Quote | null
  quoting: boolean
  quoteError: Error | null
  couponCode: string
  setCouponCode(code: string): void
  district: string
  setDistrict(district: string): void
}

const CartContext = createContext<CartContextValue | null>(null)
const NO_STATE = { lines: [], count: 0, ready: false }

export function CartProvider({
  dakio, quote: quoteFn, storageKey, maxQty = 10, children,
}: {
  /** Prices the bag with `dakio.cart.quote`. */
  dakio?: Pick<Dakio, 'cart'>
  /** Or price it yourself (e.g. a Next.js server action). */
  quote?: (input: QuoteInput) => Promise<Quote>
  /** localStorage key; default `dakio-cart`. Use one per store if a domain hosts several. */
  storageKey?: string
  maxQty?: number
  children: ReactNode
}) {
  const storeRef = useRef<CartStore | null>(null)
  if (!storeRef.current) storeRef.current = createCartStore({ storageKey, maxQty })
  const store = storeRef.current
  const state = useSyncExternalStore(store.subscribe, store.getState, () => NO_STATE)
  useEffect(() => { store.load() }, [store])

  const [isOpen, setOpen] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [district, setDistrict] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState<Error | null>(null)
  const price = quoteFn || dakio?.cart.quote
  const seq = useRef(0)

  useEffect(() => {
    if (!state.ready || !price) return
    if (!state.lines.length) { setQuote(null); setQuoteError(null); return }
    const mine = ++seq.current
    setQuoting(true)
    const t = setTimeout(() => {
      price({ items: state.lines, couponCode: couponCode || undefined, district: district || undefined })
        .then((q) => { if (mine === seq.current) { setQuote(q); setQuoteError(null) } })
        .catch((e) => { if (mine === seq.current) setQuoteError(e instanceof Error ? e : new Error(String(e))) })
        .finally(() => { if (mine === seq.current) setQuoting(false) })
    }, 150)  // a burst of +/- taps prices once
    return () => clearTimeout(t)
  }, [state.lines, state.ready, couponCode, district, price])

  const value = useMemo<CartContextValue>(() => ({
    lines: state.lines, count: state.count, ready: state.ready,
    add: store.add, setQty: store.setQty, remove: store.remove,
    clear() { store.clear(); setCouponCode('') },
    isOpen, open: () => setOpen(true), close: () => setOpen(false),
    quote, quoting, quoteError, couponCode, setCouponCode, district, setDistrict,
  }), [state, store, isOpen, quote, quoting, quoteError, couponCode, district])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export type CheckoutPhase = 'idle' | 'submitting' | 'otp' | 'verifying' | 'placed' | 'error'

export interface CheckoutState {
  phase: CheckoutPhase
  /** Set when phase is 'placed'. */
  order: Extract<CheckoutResult, { status: 'PLACED' }> | null
  /** Set when phase is 'otp' or 'verifying': where the code went and when it expires. */
  otp: { maskedPhone: string; expiresAt: string } | null
  /** The last refusal: `code` is stable (OUT_OF_STOCK, OTP_INCORRECT, …). */
  error: { code: string; message: string; productId?: string; attemptsLeft?: number } | null
  submit(input: CheckoutInput): Promise<CheckoutResult>
  verify(otp: string): Promise<CheckoutResult>
  reset(): void
}

/**
 * Place an order, including the OTP step Dakio's fake-order protection may
 * ask for. One Idempotency-Key per attempt, so a double tap never orders
 * twice. Inside a CartProvider the bag is cleared once the order is placed.
 */
export function useCheckout(dakio: Pick<Dakio, 'checkout'>, options: { onPlaced?(order: Extract<CheckoutResult, { status: 'PLACED' }>): void } = {}): CheckoutState {
  const cart = useContext(CartContext)
  const [phase, setPhase] = useState<CheckoutPhase>('idle')
  const [order, setOrder] = useState<CheckoutState['order']>(null)
  const [otp, setOtp] = useState<CheckoutState['otp']>(null)
  const [error, setError] = useState<CheckoutState['error']>(null)
  const session = useRef<string | null>(null)
  const attemptKey = useRef<string | null>(null)
  const busy = useRef(false)
  const onPlaced = useRef(options.onPlaced)
  onPlaced.current = options.onPlaced

  const settle = useCallback((r: CheckoutResult) => {
    if (r.status === 'PLACED') {
      setOrder(r); setOtp(null); setError(null); setPhase('placed')
      attemptKey.current = null; session.current = null
      cart?.clear()
      onPlaced.current?.(r)
    } else if (r.status === 'OTP_REQUIRED') {
      // Dakio keeps this answer under the key; a changed cart must not replay it.
      attemptKey.current = null
      session.current = r.sessionToken
      setOtp({ maskedPhone: r.maskedPhone, expiresAt: r.expiresAt }); setError(null); setPhase('otp')
    } else {
      setError({ code: r.code, message: r.message, productId: r.productId, attemptsLeft: r.attemptsLeft })
      // A wrong code keeps the code box open; anything else is back to the form.
      setPhase(r.code === 'OTP_INCORRECT' ? 'otp' : 'error')
      // After a lost connection the order may exist: keep the key so a retry
      // replays it instead of ordering twice. A real refusal gets a fresh key.
      if (r.code !== 'NETWORK_ERROR') attemptKey.current = null
      if (r.code !== 'OTP_INCORRECT') { session.current = null; setOtp(null) }
    }
    return r
  }, [cart])

  const submit = useCallback(async (input: CheckoutInput) => {
    if (busy.current) return { status: 'ERROR', code: 'BUSY', message: 'Already placing this order.' } as CheckoutResult
    busy.current = true
    setPhase('submitting'); setError(null)
    // Same key for retries of the same attempt; a changed form gets a new one on reset().
    attemptKey.current ||= newAttemptKey()
    try { return settle(await dakio.checkout.create(input, { idempotencyKey: attemptKey.current })) }
    finally { busy.current = false }
  }, [dakio, settle])

  const verify = useCallback(async (code: string) => {
    if (!session.current) return settle({ status: 'ERROR', code: 'SESSION_NOT_FOUND', message: 'Start the checkout again.' })
    if (busy.current) return { status: 'ERROR', code: 'BUSY', message: 'Checking the code.' } as CheckoutResult
    busy.current = true
    setPhase('verifying')
    try { return settle(await (dakio.checkout as Dakio['checkout']).verifyOtp({ sessionToken: session.current, otp: code.trim() })) }
    finally { busy.current = false }
  }, [dakio, settle])

  const reset = useCallback(() => {
    setPhase('idle'); setOrder(null); setOtp(null); setError(null)
    session.current = null; attemptKey.current = null
  }, [])

  return { phase, order, otp, error, submit, verify, reset }
}

function newAttemptKey() {
  const c = (globalThis as { crypto?: Crypto }).crypto
  return c?.randomUUID ? c.randomUUID() : `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

// ─── Abandoned cart ──────────────────────────────────────────────────────────

/**
 * Tell Dakio about a checkout the buyer started but hasn't finished, the way
 * the built-in store does: 20 s after a usable phone (8+ digits) and a name or
 * address are filled in, and once more when the page is hidden. It lands in
 * the merchant's Incomplete Orders and can start Nova's cart follow-up.
 * Dakio skips it on its own when this phone ordered in the last 24 h.
 */
export function useAbandonedCart(
  dakio: Pick<Dakio, 'leads'>,
  lead: { phone?: string; name?: string; email?: string; address?: string; city?: string; district?: string; items: CartLine[]; leadEventId?: string; checkoutEventId?: string },
  options: { enabled?: boolean; delayMs?: number } = {},
): void {
  const { enabled = true, delayMs = 20000 } = options
  const latest = useRef(lead)
  latest.current = lead
  const sent = useRef('')
  const usable = enabled && (lead.phone || '').replace(/\D/g, '').length >= 8 && !!(lead.name || lead.address) && lead.items.length > 0
  const fingerprint = usable ? JSON.stringify([lead.phone, lead.name, lead.address, lead.district, lead.items]) : ''

  useEffect(() => {
    if (!usable) return
    const send = (keepalive: boolean) => {
      if (sent.current === fingerprint) return
      sent.current = fingerprint
      const l = latest.current
      dakio.leads.capture({
        phone: l.phone!, name: l.name, email: l.email, address: l.address, city: l.city, district: l.district,
        items: l.items, leadEventId: l.leadEventId, checkoutEventId: l.checkoutEventId,
        sourceUrl: typeof location !== 'undefined' ? location.href : undefined,
      }, { keepalive }).catch(() => { sent.current = '' })
    }
    const t = setTimeout(() => send(false), delayMs)
    const onHide = () => { if (document.visibilityState === 'hidden') send(true) }
    document.addEventListener('visibilitychange', onHide)
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onHide) }
  }, [usable, fingerprint, delayMs, dakio])
}

// ─── Live visitors ───────────────────────────────────────────────────────────

/** Count this visitor in the merchant's live-visitors view (a ping now and every 30 s). */
export function useVisitPing(dakio: Pick<Dakio, 'visits'>, page: string, options: { enabled?: boolean; everyMs?: number } = {}): void {
  const { enabled = true, everyMs = 30000 } = options
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    let id = ''
    try {
      id = sessionStorage.getItem('dakio-visit') || ''
      if (!id) { id = newAttemptKey(); sessionStorage.setItem('dakio-visit', id) }
    } catch { id = newAttemptKey() }
    const ping = () => { if (document.visibilityState !== 'hidden') dakio.visits.ping({ sessionId: id, page }) }
    ping()
    const t = setInterval(ping, everyMs)
    return () => clearInterval(t)
  }, [dakio, page, enabled, everyMs])
}
