# @dakio/sdk

Build any store on **Dakio**. Your own React or Next.js site, Dakio's business behind it: catalog, sale prices, coupons, **cash-on-delivery checkout with fake-order protection**, stock, orders, couriers (Steadfast, Pathao, RedX), abandoned-cart recovery, Meta Pixel + Conversions API, and Nova.

```bash
npm install @dakio/sdk
```

```js
import { createDakio } from '@dakio/sdk'

const dakio = createDakio({ key: 'dk_pub_live_…' })

const { data: products } = await dakio.products.list({ limit: 24 })
const quote = await dakio.cart.quote({ items: [{ productId: products[0].id, variantId: null, qty: 1 }], district: 'Dhaka' })
console.log(quote.total)   // exactly what checkout will charge
```

No backend needed: everything works from the browser.

## Get a key

In Dakio: **Settings → Developers → Create key**.

| Key | Use it for | Works on |
|---|---|---|
| `dk_pub_test_…` | building | any website, `localhost` included. Orders are **test orders**: no stock moves, no SMS, nothing in your Orders. |
| `dk_pub_live_…` | your real website | only the websites you list under **Allowed websites** (HTTPS). |

A `dk_pub_` key is a **client key**: it's made to sit in browser code. It can only do what a shopper can do (see products, take COD orders, look up orders by phone), never read your customers, money or settings. Revoke it any time in the same screen.

## Rules worth knowing

- **Prices never come from your code.** A cart holds `{ productId, variantId, qty }` only. Every price on screen comes from `dakio.cart.quote()`, and checkout charges exactly the quote.
- **Checkout runs in the browser.** Dakio's fake-order protection reads the buyer's IP. On a server every buyer would share yours, so the SDK refuses to place orders there (`CHECKOUT_MUST_RUN_IN_BROWSER`). Catalog reads work anywhere, including Next.js server components.
- **Delivery is by district.** Dhaka district pays the store's inside-Dhaka rate; every other district (Gazipur and Narayanganj too) pays the outside rate.
- **Cash on delivery** is the payment method.

## React

```jsx
import { CartProvider, useCart, useCheckout } from '@dakio/sdk/react'

<CartProvider dakio={dakio}>
  <App />
</CartProvider>

function AddToBag({ product, variant }) {
  const cart = useCart()
  return <button onClick={() => cart.add({ productId: product.id, variantId: variant?.id ?? null })}>Add to bag</button>
}

function Bag() {
  const { lines, quote, setCouponCode, setDistrict } = useCart()   // quote: priced by Dakio
  // quote.lines[i].unitPrice, quote.subtotal, quote.discount, quote.shipping, quote.total, quote.problems
}

function CheckoutButton({ customer }) {
  const cart = useCart()
  const checkout = useCheckout(dakio, { onPlaced: (order) => location.assign(`/order/${order.orderNumber}`) })
  // checkout.phase: 'idle' | 'submitting' | 'otp' | 'verifying' | 'placed' | 'error'
  if (checkout.phase === 'otp') return <CodeBox onSubmit={(code) => checkout.verify(code)} sentTo={checkout.otp.maskedPhone} />
  return <button onClick={() => checkout.submit({ customer, items: cart.lines, couponCode: cart.couponCode })}>Place order</button>
}
```

`useCheckout` sends one `Idempotency-Key` per attempt, so a double tap or a retry after a dropped connection never orders twice. When Dakio's fake-order protection asks for a code (an SMS to the buyer), the phase becomes `otp`. The bag is cleared once the order is placed.

Also in `@dakio/sdk/react`:

- `useAbandonedCart(dakio, { name, phone, address, district, items })` sends a started-but-unfinished checkout to the merchant's **Incomplete Orders**, which can trigger Nova's follow-up. It fires 20 s after a usable phone is entered, and again when the page is hidden.
- `useVisitPing(dakio, pathname)` counts the visitor in the merchant's live-visitors view.

## Next.js

Read the catalog in server components (good for SEO), and check out in a client component.

```ts
// lib/dakio.ts — one client for both sides
export const dakio = createDakio({ key: process.env.NEXT_PUBLIC_DAKIO_KEY! })
```

```tsx
// app/p/[slug]/page.tsx
import { productJsonLd, productMetadata, jsonLdScript } from '@dakio/sdk/next'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const [product, store] = await Promise.all([dakio.products.get(slug), dakio.store.get()])
  return product ? productMetadata(product, store, { url: `https://mybrand.com.bd/p/${slug}` }) : {}
}
// <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, store, { url })) }} />
```

```ts
// app/sitemap.ts
import { dakioSitemap } from '@dakio/sdk/next'
export default () => dakioSitemap(dakio, { baseUrl: 'https://mybrand.com.bd' })

// app/robots.ts
import { dakioRobots } from '@dakio/sdk/next'
export default () => dakioRobots({ baseUrl: 'https://mybrand.com.bd' })
```

## The client

| Call | Returns |
|---|---|
| `store.get()` | name, logo, contact, socials, currency, delivery rates, announcement, campaign banner, Pixel/GTM ids, canonical host |
| `categories.list()` | `[{ id, name, slug, parentId, productCount }]` (build your own tree from `parentId`) |
| `products.list({ category, search, ids, page, limit, sort })` | `{ data, page, limit, total, totalPages }`. `category` is an id or slug and includes sub-categories; `limit` up to 100; `sort`: `newest` · `oldest` · `price_asc` · `price_desc` · `name_asc` |
| `products.get(idOrSlug)` | a product, or `null` |
| `shipping.get(district)` | `{ zone, charge }` |
| `cart.quote({ items, couponCode?, district? })` | priced lines, `problems` (`OUT_OF_STOCK` with `available`, `OPTION_REQUIRED`, `NOT_FOUND`…), coupon result, delivery, total, `ok` |
| `coupons.validate({ code, subtotal })` | `{ valid, reason, discount, coupon }` |
| `checkout.create(input, { idempotencyKey? })` | `PLACED` · `OTP_REQUIRED` · `ERROR` (it never throws for a refusal) |
| `checkout.verifyOtp({ sessionToken, otp })` | `PLACED` · `ERROR` (`OTP_INCORRECT` with `attemptsLeft`) |
| `leads.capture({ phone, name, items, … })` | an abandoned cart |
| `account.sendCode(phone)` / `account.orders({ sessionToken, otp })` | "my orders" by phone + SMS code, with no passwords |
| `orders.track({ orderNumber, phone })` | status (`placed` → `confirmed` → `preparing` → `shipped` → `on_the_way` → `out_for_delivery` → `delivered`, or `cancelled` / `returned`), timeline, courier, items, COD amount, or `null` |
| `visits.ping({ sessionId, page })` | `true` / `false`, never throws |

Everything else throws a `DakioError` with a stable `code` (`INVALID_PARAM`, `RATE_LIMITED`, `ORIGIN_NOT_ALLOWED`, `KEY_REVOKED`, `NETWORK_ERROR`, …) and an HTTP `status`. Reads and checkout retry network failures and 502/503/504 on their own; checkout retries reuse the same `Idempotency-Key`.

### Checkout input

```ts
await dakio.checkout.create({
  customer: { name: 'Rahim', phone: '01712345678', address: 'House 4, Road 2', district: 'Dhaka', city: 'Mirpur', email: 'optional' },
  items: [{ productId: 'cm…', variantId: 'cm…', qty: 1 }],
  couponCode: 'EID10',   // optional
  note: 'Call after 5pm', // optional
  eventId: 'pur_…',       // optional: the browser Pixel's Purchase eventID, for dedupe
})
```

Refusal codes: `INVALID_PHONE`, `DISTRICT_REQUIRED`, `CITY_REQUIRED`, `EMPTY_CART`, `NOT_FOUND`, `NOT_AVAILABLE`, `OPTION_REQUIRED`, `OUT_OF_STOCK` (+ `productId`), `PRICE_CHANGED`, `COUPON_UNAVAILABLE`, `STORE_NOT_TAKING_ORDERS`, `RATE_LIMITED`, `NETWORK_ERROR`.

## Test keys

With a `dk_pub_test_` key every check runs exactly as live (prices, stock, coupons, plan), but no real order is made. Fixed values let you build the code screens without SMS:

| | |
|---|---|
| phone `01700000001` | checkout always asks for a code |
| checkout code | `000000` |
| "my orders" code | `0000` |

Test orders get numbers like `#TEST-K3P9QX`, can be tracked and looked up by phone, and disappear after 7 days.

## Meta Pixel

Dakio already sends the server side of **Purchase**, **Lead** and **InitiateCheckout** for every store with a Pixel. Send the browser side with the same event id and Meta counts each once:

```js
import { loadPixel, trackPixel, newEventId, purchaseParams, productParams } from '@dakio/sdk/pixel'

loadPixel(store.tracking.metaPixelId)
trackPixel('ViewContent', productParams(product), newEventId())

const eventId = newEventId('pur')
const result = await dakio.checkout.create({ ...input, eventId })
if (result.status === 'PLACED') trackPixel('Purchase', purchaseParams(quote), eventId)
```

## Bangladesh helpers

```js
import { DISTRICTS, getThanas, detectLocation, isBdPhone, normalizeBdPhone, deliveryZone, formatTaka } from '@dakio/sdk/bd'

getThanas('Dhaka')                                // ['Adabor', 'Badda', …, 'Mirpur', …]
detectLocation('House 4, Mirpur 10, Dhaka')       // { district: 'Dhaka', thana: 'Mirpur' }
normalizeBdPhone('+880 1712-345678')              // '01712345678'
deliveryZone('Gazipur')                           // 'outside_dhaka'
formatTaka(125000)                                // '৳1,25,000'
```

## Starters

Two complete stores (home, shop, product, bag, checkout with OTP, tracking, "my orders") are in [`examples/`](https://github.com/alasim/dakio-sdk/tree/main/examples):

- **`react-vite`**: plain React, no backend. Deploys anywhere static.
- **`next`**: server-rendered catalog with sitemap, robots and JSON-LD.

## Versioning

`@dakio/sdk` follows semver and speaks Dakio's storefront API v1. Inside v1, fields are added, never renamed or removed.

MIT © Dakio
