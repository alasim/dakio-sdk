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
  /**
   * The merchant's "Goes well with" add-ons, in their order (up to three).
   * Only on `products.get()`; lists leave it out. Sold-out, unpublished and
   * dropship add-ons are skipped.
   */
  goesWellWith?: GoesWellWith[]
}

/** One add-on from the merchant's "Goes well with" list. */
export interface GoesWellWith {
  product: Product
  /** The merchant's one-line reason, e.g. "Gold to match the border". */
  reason: string | null
  /**
   * The add-on's price when bought with the main product, if the merchant set
   * one. Checkout applies it to a line sent with `addOnOf`; never charge it
   * yourself.
   */
  togetherPrice: number | null
}

export type Sort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc'

export interface ListQuery {
  /** A category id or slug; its sub-categories are included. */
  category?: string
  search?: string
  /** Product ids or slugs, at most 100. Results come in `sort` order, not the order given. */
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
  /** The main product's id when this line was added from its "Goes well with" list. */
  addOnOf?: string
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

/**
 * The shopper a SERVER call is made for (secret keys only). Dakio's
 * fake-order protection, the OTP caps and Meta's server events judge this IP,
 * not your server's. In Next.js: `(await headers()).get('x-forwarded-for')`.
 */
export interface Buyer {
  ip: string
  userAgent?: string | null
}

export interface CheckoutOptions {
  /** Defaults to a fresh key per call; the SDK reuses it on its own retries. */
  idempotencyKey?: string
  /** Required with a secret key (server checkout); ignored with a client key. */
  buyer?: Buyer
}

export type CheckoutErrorCode =
  | 'INVALID_INPUT' | 'INVALID_PHONE' | 'EMPTY_CART' | 'DISTRICT_REQUIRED' | 'CITY_REQUIRED'
  | 'NOT_FOUND' | 'NOT_AVAILABLE' | 'NOT_FOR_SALE' | 'PRODUCT_MISSING_PURCHASE_PRICE' | 'OPTION_REQUIRED' | 'OUT_OF_STOCK'
  | 'PRICE_CHANGED' | 'COUPON_UNAVAILABLE' | 'STORE_NOT_TAKING_ORDERS' | 'STORE_CLOSED'
  | 'OTP_INCORRECT' | 'OTP_EXPIRED' | 'SESSION_NOT_FOUND' | 'SESSION_USED' | 'TOO_MANY_ATTEMPTS'
  | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'CHECKOUT_MUST_RUN_IN_BROWSER' | 'BUYER_IP_REQUIRED' | (string & {})

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

/** A store order, as a secret key reads it (`orders.list`, `orders.get`, order webhooks). */
export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  statusLabel: string
  customer: { name: string | null; phone: string | null; email: string | null; address: string | null; city: string | null; district: string | null }
  items: { productId: string; variantId: string | null; name: string; sku: string | null; qty: number; unitPrice: number; total: number }[]
  subtotal: number
  shipping: number
  discount: number
  total: number
  paid: number
  due: number
  /** What the buyer hands the courier (null when not cash on delivery). */
  codAmount: number | null
  paymentMethod: string
  courier: { provider: string; trackingCode: string | null } | null
  note: string | null
  /** `website_sdk` = a custom website, `storefront` = the Dakio store, null = made in Dakio (manual, POS, Nova…). */
  source: { channel: string | null; apiKeyId: string | null }
  currency: string
  placedAt: string
  updatedAt: string
  test?: boolean
}

export interface OrderQuery {
  page?: number
  /** Up to 100. Default 25. */
  limit?: number
  /** ISO date or Date: orders placed since. */
  createdSince?: string | Date
  /** ISO date or Date: orders changed since — oldest change first, for syncing. */
  updatedSince?: string | Date
  /** Any form of the buyer's number. */
  phone?: string
}

export interface OrderPage {
  data: Order[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type WebhookEventType =
  | 'product.updated' | 'product.deleted' | 'stock.changed'
  | 'order.created' | 'order.status_changed' | 'store.updated'

export interface WebhookEndpoint {
  id: string
  url: string
  events: WebhookEventType[]
  description: string | null
  enabled: boolean
  /** The signing secret — only in the answer to `webhooks.create()`. */
  secret: string | null
  secretLast4: string
  createdAt: string
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

// ── Services and bookings (service businesses) ─────────────────────────────

export type ServicePriceType = 'fixed' | 'from' | 'range' | 'quote'

export interface Service {
  id: string
  /** The service's address on the website (`/s/<slug>` on Dakio's own site). */
  slug: string | null
  name: string
  description: string | null
  category: string | null
  priceType: ServicePriceType
  price: number | null
  priceMax: number | null
  /** "৳1,500", "from ৳1,500", "৳1,500–3,000" or "Ask for a quote". */
  priceText: string
  durationMin: number | null
  durationText: string | null
  imageUrl: string | null
}

export interface ServiceList {
  services: Service[]
  /** `open`: the store takes bookings online (it sells services and saved its booking hours). */
  booking: { open: boolean; autoConfirm: boolean }
}

export interface SlotDay {
  /** YYYY-MM-DD, Dhaka. */
  date: string
  day: string
  /** HH:MM, Dhaka, free for this service. */
  times: string[]
}

export interface Slots {
  service: Service
  /** The day asked for, and whether it had free times. When it had none, `days` are the next open days. */
  asked: string | null
  askedFree: boolean
  days: SlotDay[]
}

export interface BookingInput {
  /** A service id or slug. */
  service: string
  /** YYYY-MM-DD and HH:MM in Dhaka time, from `bookings.slots`. */
  date: string
  time: string
  name: string
  phone: string
  email?: string
  note?: string
}

export type BookingStatus = 'requested' | 'confirmed' | 'done' | 'no_show' | 'cancelled'

export interface Booking {
  /** Keep it: `bookings.get(token)` reads the booking's status later. */
  token: string
  status: BookingStatus
  date: string
  time: string
  /** "Sat 2 Nov, 4:30 pm" */
  when: string
  test?: boolean
}

export interface PaymentInstructions {
  bkash: string | null
  nagad: string | null
  bank: string | null
  note?: string | null
  [k: string]: unknown
}

export interface BookingView {
  status: BookingStatus
  title: string
  date: string
  time: string
  when: string
  name: string | null
  /** How to pay an advance, when the store has payment instructions. */
  pay: PaymentInstructions | null
  test?: boolean
}

export interface EnquiryInput {
  name: string
  phone?: string
  email?: string
  serviceId?: string
  message?: string
  /** Values for the store's own contact fields, by key. */
  fields?: Record<string, unknown>
  sourceUrl?: string
}

// ── Academy (a coach's programs, sold and taught on the website) ───────────

export type ProgramKind = 'course' | 'cohort' | 'coaching'
/** free: open at once · paid: open when the invoice is paid · application: the coach says yes. */
export type ProgramAccess = 'free' | 'paid' | 'application'

export interface ProgramCard {
  id: string
  slug: string
  kind: ProgramKind
  title: string
  subtitle: string | null
  coverUrl: string | null
  level: string
  durationText: string | null
  language: 'bn' | 'en'
  access: ProgramAccess
  price: number
  compareAtPrice: number | null
  /** A cohort's first day (ISO). */
  startsAt: string | null
  seats: number | null
  seatsLeft: number | null
  /** A coaching package: how many 1:1 sessions it includes. */
  sessionsIncluded: number | null
  moduleCount: number
  lessonCount: number
  durationSec: number
  previewCount: number
}

export interface LessonOutline {
  id: string
  moduleId: string
  kind: 'video' | 'text' | 'live'
  title: string
  summary: string | null
  durationSec: number
  isPreview: boolean
  thumbnailUrl: string | null
  /** Only for a free preview here; every lesson for an enrolled student. */
  youtubeId: string | null
  liveAt: string | null
  locked: boolean
}

export interface ProgramModule<L = LessonOutline> {
  id: string
  title: string
  summary: string | null
  lessons: L[]
}

export interface ProgramDetail extends ProgramCard {
  /** Sanitised HTML. */
  summary: string
  introYoutubeId: string | null
  outcomes: string[]
  includes: string[]
  audience: string[]
  faq: { q: string; a: string }[]
  /** The service a coaching package's sessions are booked as. */
  serviceId: string | null
  modules: ProgramModule[]
}

export interface EnrollInput {
  /** A program id or slug. */
  program: string
  /** Not needed when a signed-in student's token is passed. */
  name?: string
  phone?: string
  email?: string
  note?: string
  /** An application's answers, by question. */
  answers?: Record<string, string>
}

export interface EnrollResult {
  status: 'active' | 'pending' | 'completed'
  access: ProgramAccess
  /** They were already in this program. */
  already: boolean
  enrollmentId: string
  /** A paid program: the invoice to pay (its page has the store's bKash/Nagad/bank). */
  payment: { url: string | null; amount: number; number: string } | null
  pay: PaymentInstructions | null
  /** Enrolled without signing in: they sign in with the same phone to watch. */
  signInToWatch: boolean
  test?: boolean
}

export interface LoginCode {
  sessionToken: string
  expiresAt: string
  /** Test keys (always 000000), or a store without SMS outside production. */
  devCode?: string
  test?: boolean
}

export interface Student {
  name: string
  phone: string | null
  email: string | null
}

export interface StudentSession {
  /** Send it as `student` on the calls below. Keep it in the browser (it lasts 30 days). */
  token: string
  expiresAt: string
  student: Student
  test?: boolean
}

export interface EnrollmentProgress {
  completedLessons: number
  totalLessons: number
  percent: number
  /** The first unfinished lesson: where "Continue" goes. */
  nextLessonId: string | null
  lastLessonId: string | null
}

export interface StudentEnrollment {
  id: string
  status: 'pending' | 'active' | 'completed'
  enrolledAt: string
  activatedAt: string | null
  program: ProgramCard
  progress: EnrollmentProgress | null
  /** A pending paid enrollment's invoice. */
  bill: { number: string; total: number; paid: number; status: string; url: string } | null
}

export interface StudentHome {
  student: Student
  enrollments: StudentEnrollment[]
  /** How to pay a bill that is due (the store's bKash / Nagad / bank), when one is. */
  pay: PaymentInstructions | null
  test?: boolean
}

export interface StudentLesson extends LessonOutline {
  bodyHtml: string
  resources: { label: string; url: string }[]
  liveUrl: string | null
  progress: { positionSec: number; watchedSec: number; completed: boolean; completedAt: string | null }
}

export interface StudentProgram extends Omit<StudentEnrollment, 'bill'> {
  detail: Omit<ProgramDetail, 'modules'> & { modules: ProgramModule<StudentLesson>[] }
  test?: boolean
}

export interface ProgressInput {
  lessonId: string
  /** Where the player is now (the resume point). */
  positionSec?: number
  /** The furthest point reached. 90% of the lesson finishes it. */
  watchedSec?: number
  /** "Mark as done" (text and live lessons). */
  completed?: boolean
}

export interface ProgressResult {
  lessonId: string
  positionSec: number
  watchedSec: number
  completed: boolean
  completedAt: string | null
  /** This finished the last lesson: the program is completed. */
  programCompleted?: boolean
  test?: boolean
}
