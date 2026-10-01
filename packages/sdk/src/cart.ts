import type { CartLine } from './types.ts'

/**
 * The bag, without a framework. Lines are `{ productId, variantId, qty }` and
 * nothing else: every price on screen comes from `dakio.cart.quote()`, so a
 * bag can never show a price the order won't charge.
 *
 * Saved in localStorage (when there is one) and kept in step across tabs.
 * `@dakio/sdk/react`'s CartProvider wraps this.
 */

export interface CartStorage {
  get(key: string): string | null
  set(key: string, value: string): void
}

export interface CartState {
  lines: CartLine[]
  /** Total quantity. */
  count: number
  /** False until the saved bag has been read (render a neutral bag until then). */
  ready: boolean
}

export interface CartStore {
  getState(): CartState
  subscribe(listener: (state: CartState) => void): () => void
  /** Read the saved bag. Call once on the client (e.g. in an effect). */
  load(): void
  add(line: { productId: string; variantId?: string | null; qty?: number }): void
  setQty(productId: string, variantId: string | null, qty: number): void
  remove(productId: string, variantId: string | null): void
  clear(): void
}

const browserStorage = (): CartStorage | null => {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage
    if (!ls) return null
    return { get: (k) => ls.getItem(k), set: (k, v) => ls.setItem(k, v) }
  } catch { return null }
}

const same = (l: CartLine, productId: string, variantId: string | null | undefined) =>
  l.productId === productId && (l.variantId ?? null) === (variantId ?? null)

function parse(raw: string | null, maxQty: number): CartLine[] {
  try {
    const v = raw ? JSON.parse(raw) : []
    if (!Array.isArray(v)) return []
    return v
      .filter((l) => l && typeof l.productId === 'string' && Number.isInteger(l.qty) && l.qty > 0)
      .map((l) => ({ productId: l.productId, variantId: typeof l.variantId === 'string' ? l.variantId : null, qty: Math.min(maxQty, l.qty) }))
  } catch { return [] }
}

export function createCartStore(options: { storageKey?: string; storage?: CartStorage | null; maxQty?: number } = {}): CartStore {
  const key = options.storageKey || 'dakio-cart'
  const maxQty = options.maxQty ?? 10
  const storage = options.storage === undefined ? browserStorage() : options.storage
  let state: CartState = { lines: [], count: 0, ready: false }
  const listeners = new Set<(s: CartState) => void>()
  let listening = false

  const emit = (lines: CartLine[], ready = true) => {
    state = { lines, count: lines.reduce((s, l) => s + l.qty, 0), ready }
    for (const fn of listeners) fn(state)
  }
  const commit = (lines: CartLine[]) => {
    try { storage?.set(key, JSON.stringify(lines)) } catch { /* private mode: the bag lives in memory */ }
    emit(lines)
  }

  return {
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
    load() {
      emit(parse(storage?.get(key) ?? null, maxQty))
      const w = (globalThis as { window?: Window }).window
      if (!listening && w?.addEventListener) {
        listening = true
        w.addEventListener('storage', (e: StorageEvent) => { if (e.key === key) emit(parse(e.newValue, maxQty)) })
      }
    },
    add({ productId, variantId = null, qty = 1 }) {
      if (!productId || !(qty > 0)) return
      const existing = state.lines.find((l) => same(l, productId, variantId))
      commit(existing
        ? state.lines.map((l) => (l === existing ? { ...l, qty: Math.min(maxQty, l.qty + qty) } : l))
        : [...state.lines, { productId, variantId: variantId ?? null, qty: Math.min(maxQty, qty) }])
    },
    setQty(productId, variantId, qty) {
      commit(qty <= 0
        ? state.lines.filter((l) => !same(l, productId, variantId))
        : state.lines.map((l) => (same(l, productId, variantId) ? { ...l, qty: Math.min(maxQty, qty) } : l)))
    },
    remove(productId, variantId) { commit(state.lines.filter((l) => !same(l, productId, variantId))) },
    clear() { commit([]) },
  }
}
