/**
 * The shapes of the Dakio storefront API (`/api/sdk/v1`). Inside v1, fields
 * are added, never renamed or removed.
 */

export interface Store {
  id: string
  name: string
  slug: string
  description: string | null
  currency: string
  logoUrl: string | null
  faviconUrl: string | null
  accentColor: string | null
  /** The one address this store counts as on the web (its verified custom domain, else <slug>.dakio.shop). */
  canonicalHost: string | null
  contact: {
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    whatsapp: string | null
  }
  social: {
    website: string | null
    facebook: string | null
    instagram: string | null
  }
  /** A running campaign's banner, else the store's own announcement. */
  announcement: string | null
  campaignBanner: { text: string; campaignId: string } | null
  /** The store's two delivery rates. What a buyer pays comes from `shipping.get(district)` or a quote. */
  delivery: { insideDhaka: number; outsideDhaka: number }
  tracking: { metaPixelId: string | null; gtmContainerId: string | null }
  paymentMethods: string[]
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  /** Published products directly in this category (not its children). */
  productCount: number
}

export interface ProductAttribute {
  name: string
  values: string[]
}

export interface Variant {
  id: string
  name: string
  sku: string | null
  attrs: { name: string; value: string }[]
  /** The price checkout charges, sale included. */
  price: number
  /** The pre-sale price while a sale runs. */
  compareAtPrice: number | null
  /** Null for products shipped from Dakio's warehouse (stock is per product there). */
  stock: number | null
  inStock: boolean
}

export interface ContentTab {
  key: string
  title: string
  /** Sanitised HTML. */
  html: string
}

export interface Product {
  id: string
  slug: string
  name: string
  sku: string | null
  /** Sanitised HTML. */
  description: string | null
  shortDescription: string | null
  contentTabs: ContentTab[] | null
  images: string[]
  /** The price checkout charges, sale included. */
  price: number
  /** The pre-sale price during a sale, else the merchant's compare-at price when higher. */
  compareAtPrice: number | null
  onSale: boolean
  campaign: { id: string; name: string; percent: number | null } | null
  category: { id: string; name: string; slug: string } | null
  attributes: ProductAttribute[]
  stock: { total: number; inStock: boolean }
  isNew: boolean
  createdAt: string
  variants: Variant[]
}

export type Sort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc'

export interface ListQuery {
  /** A category id or slug; its sub-categories are included. */
  category?: string
  search?: string
  ids?: string[]
  page?: number
  /** 1–100, default 24. */
  limit?: number
  sort?: Sort
}

export interface ProductPage {
  data: Product[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type DeliveryZone = 'inside_dhaka' | 'outside_dhaka'

export interface Shipping {
  charge: number
  zone: DeliveryZone
}

/** A cart line. Never carries a price: a quote is the only place prices come from. */
export interface CartLine {
  productId: string
  variantId: string | null
  qty: number
}

export interface QuoteInput {
  items: CartLine[]
  couponCode?: string
  district?: string
}

export type ProblemCode = 'NOT_FOUND' | 'NOT_AVAILABLE' | 'NOT_FOR_SALE' | 'OPTION_REQUIRED' | 'OUT_OF_STOCK' | (string & {})

export interface Problem {
  code: ProblemCode
  message: string
  /** With OUT_OF_STOCK: how many are left. */
  available?: number
}

export interface QuoteLine {
  productId: string
  variantId: string | null
  variantName: string | null
  name: string
  sku: string | null
  imageUrl: string | null
  qty: number
  unitPrice: number
  compareAtPrice: number | null
  /** Null when the line has a problem (it's left out of the totals). */
  lineTotal: number | null
  problem: Problem | null
}

export type CouponReason = 'NOT_FOUND' | 'NOT_STARTED' | 'CAMPAIGN_NOT_RUNNING' | 'EXPIRED' | 'USED_UP' | 'MIN_ORDER'

export interface Quote {
  /** True when this exact cart can be ordered now. */
  ok: boolean
  storeAcceptingOrders: boolean
  lines: QuoteLine[]
  subtotal: number
  discount: number
  coupon: { code: string; valid: boolean; reason: CouponReason | null; minOrder?: number } | null
  /** Null until a district is given. */
  shipping: Shipping | null
  total: number
  currency: string
  problems: (Problem & { index: number; productId: string })[]
}

export interface CouponCheck {
  valid: boolean
  reason: CouponReason | null
  discount: number
  coupon: { code: string; type: 'PERCENT' | 'FIXED' | (string & {}); amount: number; minOrder: number } | null
}

export interface CheckoutCustomer {
  name: string
  /** A Bangladesh mobile: 01XXXXXXXXX (+880 forms accepted). */
  phone: string
  email?: string
  address: string
  district: string
  /** Thana / upazila. */
  city: string
}

export interface CheckoutInput {
  customer: CheckoutCustomer
  items: CartLine[]
  couponCode?: string
  note?: string
  /** The browser Pixel's Purchase eventID, so Dakio's server event dedupes with it (see @dakio/sdk/pixel). */
  eventId?: string
}

export interface CheckoutOptions {
  /** Defaults to a fresh key per call; the SDK reuses it on its own retries. */
  idempotencyKey?: string
}

export type CheckoutErrorCode =
  | 'INVALID_INPUT' | 'INVALID_PHONE' | 'EMPTY_CART' | 'DISTRICT_REQUIRED' | 'CITY_REQUIRED'
  | 'NOT_FOUND' | 'NOT_AVAILABLE' | 'NOT_FOR_SALE' | 'PRODUCT_MISSING_PURCHASE_PRICE' | 'OPTION_REQUIRED' | 'OUT_OF_STOCK'
  | 'PRICE_CHANGED' | 'COUPON_UNAVAILABLE' | 'STORE_NOT_TAKING_ORDERS' | 'STORE_CLOSED'
  | 'OTP_INCORRECT' | 'OTP_EXPIRED' | 'SESSION_NOT_FOUND' | 'SESSION_USED' | 'TOO_MANY_ATTEMPTS'
  | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'CHECKOUT_MUST_RUN_IN_BROWSER' | (string & {})

export type CheckoutResult =
  | { status: 'PLACED'; orderNumber: string; orderId: string; total: number; test?: boolean }
  | { status: 'OTP_REQUIRED'; sessionToken: string; maskedPhone: string; expiresAt: string; test?: boolean }
  | { status: 'ERROR'; code: CheckoutErrorCode; message: string; productId?: string; attemptsLeft?: number }

export interface LeadInput {
  phone: string
  name?: string
  email?: string
  address?: string
  city?: string
  district?: string
  items: CartLine[]
  sourceUrl?: string
  leadEventId?: string
  checkoutEventId?: string
}

export type OrderStatus =
  | 'placed' | 'confirmed' | 'preparing' | 'shipped' | 'on_the_way' | 'out_for_delivery' | 'delivered'
  | 'cancelled' | 'returned'

export interface TrackedOrder {
  orderNumber: string
  status: OrderStatus
  statusLabel: string
  isFinal: boolean
  timeline: { key: OrderStatus; label: string; done: boolean; current: boolean; at: string | null }[]
  courier: string | null
  items: { name: string; qty: number; unitPrice: number; total: number }[]
  subtotal: number
  shipping: number
  discount: number
  total: number
  paymentMethod: string
  /** What the buyer hands the courier. */
  codAmount: number | null
  currency: string
  placedAt: string
  updatedAt: string
  test?: boolean
}

export interface AccountCode {
  sessionToken: string
  expiresAt: string
  /** Only with test keys (always 0000) or a store without SMS outside production. */
  devCode?: string
  test?: boolean
}

export interface AccountOrder {
  orderNumber: string
  status: OrderStatus
  statusLabel: string
  total: number
  placedAt: string
  test?: boolean
}

/**
 * What a storefront talks to. `createDakio()` returns this; so can a demo
 * catalog, so a site built on demo data goes live by swapping one object.
 */
export interface Commerce {
  mode: 'demo' | 'live'
  store: { get(): Promise<Store> }
  categories: { list(): Promise<Category[]> }
  products: {
    list(query?: ListQuery): Promise<ProductPage>
    get(idOrSlug: string): Promise<Product | null>
  }
  shipping: { get(district: string): Promise<Shipping> }
  cart: { quote(input: QuoteInput): Promise<Quote> }
  checkout: { create(input: CheckoutInput, options?: CheckoutOptions): Promise<CheckoutResult> }
}
