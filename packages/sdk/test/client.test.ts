// createDakio against a fake fetch: request shapes, answers, errors, retries
// with the same Idempotency-Key, and the browser-only guard on checkout.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDakio, DakioError } from '../src/index.ts'

const LIVE = 'dk_pub_live_' + 'A'.repeat(24)
const TEST = 'dk_pub_test_' + 'B'.repeat(24)

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown }

function fakeFetch(answers: Array<{ status: number; body?: unknown } | Error>) {
  const calls: Call[] = []
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method || 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const a = answers.length > 1 ? answers.shift()! : answers[0]
    if (a instanceof Error) throw a
    return new Response(a.body === undefined ? 'null' : JSON.stringify(a.body), { status: a.status, headers: { 'Content-Type': 'application/json' } })
  }) as unknown as typeof fetch
  return { fn, calls }
}

const client = (answers: Parameters<typeof fakeFetch>[0], extra: Record<string, unknown> = {}) => {
  const f = fakeFetch(answers)
  return { dakio: createDakio({ key: LIVE, baseUrl: 'https://api.test/sdk/v1/', fetch: f.fn, serverCheckout: 'allow', ...extra }), calls: f.calls }
}

test('createDakio refuses a missing or malformed key', () => {
  assert.throws(() => createDakio({ key: '' }), (e: DakioError) => e.code === 'INVALID_KEY')
  assert.throws(() => createDakio({ key: 'sk_live_123' }), (e: DakioError) => e.code === 'INVALID_KEY')
  assert.equal(createDakio({ key: TEST }).keyMode, 'test')
  assert.equal(createDakio({ key: LIVE }).mode, 'live')
})

test('reads send the key and unwrap { data }', async () => {
  const { dakio, calls } = client([{ status: 200, body: { data: { name: 'My Brand', currency: 'BDT' } } }])
  const store = await dakio.store.get()
  assert.equal(store.name, 'My Brand')
  assert.equal(calls[0].url, 'https://api.test/sdk/v1/store')
  assert.equal(calls[0].headers['Dakio-Key'], LIVE)
})

test('products.list keeps the page object and joins ids; get → null on NOT_FOUND', async () => {
  const page = { data: [{ id: 'p1' }], page: 2, limit: 10, total: 11, totalPages: 2 }
  const { dakio, calls } = client([{ status: 200, body: page }, { status: 404, body: { error: { code: 'NOT_FOUND', message: 'No such product' } } }])
  assert.deepEqual(await dakio.products.list({ page: 2, limit: 10, ids: ['a', 'b'], sort: 'price_asc', search: '' }), page)
  assert.equal(calls[0].url, 'https://api.test/sdk/v1/products?page=2&limit=10&sort=price_asc&ids=a%2Cb')
  assert.equal(await dakio.products.get('nope'), null)
  assert.equal(calls[1].url, 'https://api.test/sdk/v1/products/nope')
})

test('errors become DakioError with the API code', async () => {
  const { dakio } = client([{ status: 400, body: { error: { code: 'INVALID_PARAM', message: 'limit must be…' } } }])
  await assert.rejects(dakio.products.list({ limit: 500 }), (e: DakioError) => e.code === 'INVALID_PARAM' && e.status === 400 && e instanceof DakioError)
})

test('reads retry a network failure or 503, not a 400', async () => {
  const flaky = client([new TypeError('fetch failed'), { status: 503, body: {} }, { status: 200, body: { data: [] } }])
  assert.deepEqual(await flaky.dakio.categories.list(), [])
  assert.equal(flaky.calls.length, 3)
  const bad = client([{ status: 400, body: { error: { code: 'X', message: 'x' } } }])
  await assert.rejects(bad.dakio.categories.list())
  assert.equal(bad.calls.length, 1)
})

test('checkout: 201 → PLACED, sends an Idempotency-Key and the input as given', async () => {
  const { dakio, calls } = client([{ status: 201, body: { data: { orderNumber: '#ABC-DEFG', orderId: 'o1', total: 1060 } } }])
  const input = { customer: { name: 'R', phone: '01712345678', address: 'Road 1', district: 'Dhaka', city: 'Mirpur' }, items: [{ productId: 'cap', variantId: null, qty: 2 }], eventId: 'ev_1' }
  const r = await dakio.checkout.create(input)
  assert.deepEqual(r, { status: 'PLACED', orderNumber: '#ABC-DEFG', orderId: 'o1', total: 1060 })
  assert.deepEqual(calls[0].body, input)
  assert.ok(calls[0].headers['Idempotency-Key'].length >= 8)
})

test('checkout: 202 → OTP_REQUIRED; verifyOtp → PLACED; a wrong code → ERROR with attemptsLeft', async () => {
  const { dakio } = client([
    { status: 202, body: { data: { status: 'OTP_REQUIRED', sessionToken: 's1', maskedPhone: '01*******78', expiresAt: '2026-10-02T10:00:00Z' } } },
    { status: 400, body: { error: { code: 'OTP_INCORRECT', message: 'Incorrect code.', attemptsLeft: 2 } } },
    { status: 201, body: { data: { orderNumber: '#X', orderId: 'o2', total: 500 } } },
  ])
  const first = await dakio.checkout.create({ customer: {} as never, items: [] })
  assert.equal(first.status, 'OTP_REQUIRED')
  assert.deepEqual(await dakio.checkout.verifyOtp({ sessionToken: 's1', otp: '1' }), { status: 'ERROR', code: 'OTP_INCORRECT', message: 'Incorrect code.', attemptsLeft: 2 })
  assert.equal((await dakio.checkout.verifyOtp({ sessionToken: 's1', otp: '123456' })).status, 'PLACED')
})

test('checkout retries a lost connection with the SAME Idempotency-Key (no double order)', async () => {
  const { dakio, calls } = client([new TypeError('socket hang up'), { status: 409, body: { error: { code: 'IDEMPOTENCY_IN_PROGRESS', message: 'wait' } } }, { status: 201, body: { data: { orderNumber: '#Y', orderId: 'o3', total: 1 } } }])
  const r = await dakio.checkout.create({ customer: {} as never, items: [] }, { idempotencyKey: 'attempt-0001' })
  assert.equal(r.status, 'PLACED')
  assert.deepEqual(calls.map(c => c.headers['Idempotency-Key']), ['attempt-0001', 'attempt-0001', 'attempt-0001'])
})

test('checkout refusals come back as ERROR, never thrown', async () => {
  const { dakio } = client([{ status: 400, body: { error: { code: 'OUT_OF_STOCK', message: '"Cap" is out of stock.', productId: 'cap' } } }])
  assert.deepEqual(await dakio.checkout.create({ customer: {} as never, items: [] }), { status: 'ERROR', code: 'OUT_OF_STOCK', message: '"Cap" is out of stock.', productId: 'cap' })
  const down = client([new TypeError('offline')])
  const r = await down.dakio.checkout.create({ customer: {} as never, items: [] })
  assert.equal(r.status === 'ERROR' && r.code, 'NETWORK_ERROR')
})

test('on a server, checkout / leads / my-orders refuse unless serverCheckout is allowed', async () => {
  const { dakio, calls } = client([{ status: 201, body: { data: {} } }], { serverCheckout: 'refuse' })
  const r = await dakio.checkout.create({ customer: {} as never, items: [] })
  assert.equal(r.status === 'ERROR' && r.code, 'CHECKOUT_MUST_RUN_IN_BROWSER')
  await assert.rejects(dakio.leads.capture({ phone: '01712345678', items: [] }), (e: DakioError) => e.code === 'CHECKOUT_MUST_RUN_IN_BROWSER')
  await assert.rejects(dakio.account.sendCode('01712345678'), (e: DakioError) => e.code === 'CHECKOUT_MUST_RUN_IN_BROWSER')
  assert.equal(calls.length, 0, 'nothing was sent')
})

test('orders.track → null when not found; visits.ping never throws', async () => {
  const { dakio, calls } = client([{ status: 404, body: { error: { code: 'NOT_FOUND', message: 'No order' } } }, new TypeError('offline')])
  assert.equal(await dakio.orders.track({ orderNumber: '#ABC', phone: '017' }), null)
  assert.equal(calls[0].url, 'https://api.test/sdk/v1/orders/track?orderNumber=%23ABC&phone=017')
  assert.equal(await dakio.visits.ping({ sessionId: 's' }), false)
})

test('shipping.get returns { charge, zone }', async () => {
  const { dakio, calls } = client([{ status: 200, body: { data: { district: 'Gazipur', zone: 'outside_dhaka', charge: 120, currency: 'BDT' } } }])
  assert.deepEqual(await dakio.shipping.get('Gazipur'), { charge: 120, zone: 'outside_dhaka' })
  assert.equal(calls[0].url, 'https://api.test/sdk/v1/shipping?district=Gazipur')
})
