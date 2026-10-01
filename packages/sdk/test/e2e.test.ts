// End to end against a real Dakio API with a TEST key (never creates a real
// order). Skipped unless both are given:
//
//   DAKIO_E2E_URL=http://localhost:5099/api/sdk/v1 DAKIO_E2E_KEY=dk_pub_test_… npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDakio } from '../src/index.ts'

const url = process.env.DAKIO_E2E_URL
const key = process.env.DAKIO_E2E_KEY
const skip = !url || !key ? 'set DAKIO_E2E_URL and DAKIO_E2E_KEY (a dk_pub_test_ key) to run' : false

test('a whole store flow on a test key', { skip }, async () => {
  const dakio = createDakio({ key: key!, baseUrl: url, serverCheckout: 'allow' })
  assert.equal(dakio.keyMode, 'test', 'use a TEST key for this test')

  const store = await dakio.store.get()
  assert.ok(store.name)
  const categories = await dakio.categories.list()
  assert.ok(Array.isArray(categories))

  const page = await dakio.products.list({ limit: 5 })
  assert.ok(page.total >= 1, 'the store needs at least one published product')
  const first = page.data.find(p => p.stock.inStock)
  assert.ok(first, 'the store needs a product in stock')
  const product = await dakio.products.get(first.slug)
  assert.equal(product?.id, first.id)
  assert.equal(await dakio.products.get('no-such-product-' + Date.now()), null)

  const variant = product!.variants.find(v => v.inStock) || null
  const items = [{ productId: product!.id, variantId: variant?.id ?? null, qty: 1 }]
  const shipping = await dakio.shipping.get('Gazipur')
  assert.equal(shipping.zone, 'outside_dhaka')
  const quote = await dakio.cart.quote({ items, district: 'Gazipur' })
  assert.equal(quote.ok, true, JSON.stringify(quote.problems))
  assert.equal(quote.total, quote.subtotal + shipping.charge - quote.discount)

  const customer = { name: 'SDK Test', phone: '01811111111', address: 'Road 1', district: 'Gazipur', city: 'Tongi' }
  const placed = await dakio.checkout.create({ customer, items })
  assert.equal(placed.status, 'PLACED', JSON.stringify(placed))
  if (placed.status !== 'PLACED') return
  assert.equal(placed.test, true)
  assert.equal(placed.total, quote.total)

  const tracked = await dakio.orders.track({ orderNumber: placed.orderNumber, phone: '+8801811111111' })
  assert.equal(tracked?.status, 'placed')
  assert.equal(tracked?.total, quote.total)

  const otp = await dakio.checkout.create({ customer: { ...customer, phone: '01700000001' }, items })
  assert.equal(otp.status, 'OTP_REQUIRED')
  if (otp.status !== 'OTP_REQUIRED') return
  const wrong = await dakio.checkout.verifyOtp({ sessionToken: otp.sessionToken, otp: '111111' })
  assert.equal(wrong.status === 'ERROR' && wrong.code, 'OTP_INCORRECT')
  assert.equal((await dakio.checkout.verifyOtp({ sessionToken: otp.sessionToken, otp: '000000' })).status, 'PLACED')

  const code = await dakio.account.sendCode('01811111111')
  assert.equal(code.devCode, '0000')
  const mine = await dakio.account.orders({ sessionToken: code.sessionToken, otp: '0000' })
  assert.ok(mine.some(o => o.orderNumber === placed.orderNumber))

  assert.deepEqual(await dakio.leads.capture({ phone: '01811111111', name: 'SDK Test', items }), { ok: true, test: true })
  assert.equal(await dakio.visits.ping({ sessionId: 'sdk-e2e' }), true)
})
