// Cut 5 in the package: a secret key on a server (buyer IP, order reads,
// webhooks), verifyWebhook, and the Next.js revalidate route.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createDakio, DakioError } from '../src/index.ts'
import { verifyWebhook, signWebhook, WEBHOOK_EVENTS } from '../src/webhooks/index.ts'
import { createRevalidateRoute, defaultRevalidateTargets } from '../src/next/index.ts'

const SEC = 'dk_sec_live_' + 'S'.repeat(24)
const PUB = 'dk_pub_live_' + 'P'.repeat(24)

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown }
function fakeFetch(answers: Array<{ status: number; body?: unknown }>) {
  const calls: Call[] = []
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method || 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const a = answers.length > 1 ? answers.shift()! : answers[0]
    return new Response(JSON.stringify(a.body ?? null), { status: a.status, headers: { 'Content-Type': 'application/json' } })
  }) as unknown as typeof fetch
  return { fn, calls }
}
const make = (key: string, answers: Parameters<typeof fakeFetch>[0]) => {
  const f = fakeFetch(answers)
  return { dakio: createDakio({ key, baseUrl: 'https://api.test/sdk/v1', fetch: f.fn }), calls: f.calls }
}

test('a secret key checks out from a server only with the buyer, whose IP goes in a header', async () => {
  const { dakio, calls } = make(SEC, [{ status: 201, body: { data: { orderNumber: '#A', orderId: 'o1', total: 560 } } }])
  assert.equal(dakio.keyKind, 'sec')
  const input = { customer: { name: 'R', phone: '01712345678', address: 'x', district: 'Dhaka', city: 'Mirpur' }, items: [{ productId: 'cap', variantId: null, qty: 1 }] }
  const refused = await dakio.checkout.create(input)
  assert.deepEqual([refused.status, refused.status === 'ERROR' && refused.code], ['ERROR', 'BUYER_IP_REQUIRED'])
  assert.equal(calls.length, 0, 'never sent')
  const r = await dakio.checkout.create(input, { buyer: { ip: '103.4.5.6, 10.0.0.1', userAgent: 'Mozilla/5.0' } })
  assert.equal(r.status, 'PLACED')
  assert.equal(calls[0].headers['Dakio-Buyer-Ip'], '103.4.5.6', 'first x-forwarded-for hop')
  assert.equal(calls[0].headers['Dakio-Buyer-Agent'], 'Mozilla/5.0')
  await assert.rejects(dakio.account.sendCode('01712345678'), (e: DakioError) => e.code === 'BUYER_IP_REQUIRED')
})

test('a client key never sends a buyer header (Dakio would not trust it anyway)', async () => {
  const f = fakeFetch([{ status: 201, body: { data: { orderNumber: '#A', orderId: 'o1', total: 1 } } }])
  const dakio = createDakio({ key: PUB, baseUrl: 'https://api.test/sdk/v1', fetch: f.fn, serverCheckout: 'allow' })
  await dakio.checkout.create({ customer: { name: 'R', phone: '01712345678', address: 'x', district: 'Dhaka', city: 'M' }, items: [{ productId: 'c', variantId: null, qty: 1 }] }, { buyer: { ip: '1.2.3.4' } })
  assert.equal(f.calls[0].headers['Dakio-Buyer-Ip'], undefined)
})

test('orders.list / get and webhooks need a secret key', async () => {
  const page = { data: [{ id: 'o1', orderNumber: '#ABC-1' }], page: 1, limit: 25, total: 1, totalPages: 1 }
  const { dakio, calls } = make(SEC, [
    { status: 200, body: page },
    { status: 200, body: { data: { id: 'o1' } } },
    { status: 404, body: { error: { code: 'NOT_FOUND', message: 'none' } } },
    { status: 201, body: { data: { id: 'e1', secret: 'whsec_x' } } },
    { status: 200, body: { data: { deleted: true } } },
  ])
  assert.deepEqual(await dakio.orders.list({ updatedSince: new Date('2026-10-01T00:00:00Z'), limit: 50 }), page)
  assert.equal(calls[0].url, 'https://api.test/sdk/v1/orders?limit=50&updatedSince=2026-10-01T00%3A00%3A00.000Z')
  assert.deepEqual(await dakio.orders.get('#ABC-1'), { id: 'o1' })
  assert.equal(calls[1].url, 'https://api.test/sdk/v1/orders/ABC-1')
  assert.equal(await dakio.orders.get('nope'), null)
  assert.equal((await dakio.webhooks.create({ url: 'https://x.com/h', events: ['order.created'] })).secret, 'whsec_x')
  await dakio.webhooks.delete('e1')
  assert.equal(calls[4].method, 'DELETE')

  const pub = make(PUB, [{ status: 200, body: {} }])
  await assert.rejects(pub.dakio.orders.list(), (e: DakioError) => e.code === 'SECRET_KEY_REQUIRED')
  await assert.rejects(pub.dakio.webhooks.list(), (e: DakioError) => e.code === 'SECRET_KEY_REQUIRED')
  assert.equal(pub.calls.length, 0)
})

test('a secret key in a browser is refused at createDakio', () => {
  const g = globalThis as Record<string, unknown>
  g.window = {}; g.document = {}
  try {
    assert.throws(() => createDakio({ key: SEC }), (e: DakioError) => e.code === 'SECRET_KEY_IN_BROWSER')
  } finally { delete g.window; delete g.document }
})

const SECRET = 'whsec_' + 'k'.repeat(32)
const event = { id: 'evt_1', type: 'product.updated', createdAt: '2026-10-02T10:00:00.000Z', storeId: 't1', data: { id: 'p1', slug: 'oxford-shirt', published: true, product: null } }

test('verifyWebhook matches the API\'s signature, and refuses tampering, replays and wrong secrets', async () => {
  const body = JSON.stringify(event)
  const t = 1_790_000_000
  // The API signs exactly like this (dakio-api src/lib/webhooks.js signatureHeader).
  const apiHeader = `t=${t},v1=${crypto.createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex')}`
  assert.equal(await signWebhook(body, SECRET, t), apiHeader)
  const now = (t + 30) * 1000
  assert.deepEqual(await verifyWebhook({ body, signature: apiHeader, secret: SECRET, now }), event)
  const bad = async (input: Partial<Parameters<typeof verifyWebhook>[0]>) =>
    assert.rejects(verifyWebhook({ body, signature: apiHeader, secret: SECRET, now, ...input }), (e: DakioError) => e.code === 'WEBHOOK_SIGNATURE_INVALID' && e.status === 400)
  await bad({ body: body.replace('oxford', 'oxfordx') })
  await bad({ secret: 'whsec_wrong' })
  await bad({ now: (t + 301) * 1000 })
  await bad({ signature: null })
  await bad({ signature: 'v1=abc' })
  assert.equal(WEBHOOK_EVENTS.length, 6)
})

test('createRevalidateRoute: verified events refresh their pages; unsigned ones get a 400', async () => {
  const paths: string[] = []
  const tags: string[] = []
  const seen: string[] = []
  const POST = createRevalidateRoute({
    secret: SECRET,
    revalidatePath: (p, type) => { paths.push(type ? `${p}|${type}` : p) },
    revalidateTag: (tag, profile) => { tags.push(`${tag}|${profile}`) },
    onEvent: (e) => { seen.push(e.type) },
  })
  const body = JSON.stringify(event)
  const req = async (sig: string | null) => POST(new Request('https://site/api/dakio/revalidate', { method: 'POST', body, headers: sig ? { 'Dakio-Signature': sig } : {} }))

  const ok = await req(await signWebhook(body, SECRET))
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { ok: true, type: 'product.updated', revalidated: ['/p/oxford-shirt', '/shop (layout)', '/'] })
  assert.deepEqual(paths, ['/p/oxford-shirt', '/shop|layout', '/'])
  assert.deepEqual(tags, ['dakio:products|max', 'dakio:product:p1|max'])
  assert.deepEqual(seen, ['product.updated'])

  const no = await req(await signWebhook(body, 'whsec_other'))
  assert.equal(no.status, 400)
  assert.equal(paths.length, 3, 'nothing refreshed')

  const store = { ...event, type: 'store.updated', data: { store: {} } } as never
  assert.deepEqual(defaultRevalidateTargets(store).paths, [{ path: '/', type: 'layout' }])
  const order = { ...event, type: 'order.created', data: { order: {} } } as never
  assert.deepEqual(defaultRevalidateTargets(order).paths, [])
  assert.deepEqual(defaultRevalidateTargets({ ...event, type: 'stock.changed', data: { productId: 'p1', variantId: null, slug: 'cap', stock: 0, inStock: false, productStock: 0 } } as never, { productPath: (s) => `/products/${s}` }).paths,
    ['/products/cap', { path: '/shop', type: 'layout' }])
})
