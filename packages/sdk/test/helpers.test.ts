// The cart store, Bangladesh helpers, Pixel params and the Next.js SEO helpers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCartStore } from '../src/cart.ts'
import { DISTRICTS, THANAS, getThanas, deliveryZone, detectLocation, isBdPhone, normalizeBdPhone, formatTaka } from '../src/bd/index.ts'
import { newEventId, productParams, purchaseParams, trackPixel } from '../src/pixel/index.ts'
import { dakioSitemap, dakioRobots, productJsonLd, productMetadata, jsonLdScript } from '../src/next/index.ts'
import type { Product, Quote } from '../src/types.ts'

function memoryStorage() {
  const m = new Map<string, string>()
  return { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => { m.set(k, v) }, m }
}

test('cart: add merges, caps qty, setQty 0 removes, saved and reloaded', () => {
  const storage = memoryStorage()
  const cart = createCartStore({ storage, maxQty: 5 })
  const seen: number[] = []
  cart.subscribe(s => seen.push(s.count))
  cart.load()
  assert.equal(cart.getState().ready, true)
  cart.add({ productId: 'cap' })
  cart.add({ productId: 'cap', qty: 2 })
  cart.add({ productId: 'shirt', variantId: 'xl', qty: 9 })
  assert.deepEqual(cart.getState().lines, [{ productId: 'cap', variantId: null, qty: 3 }, { productId: 'shirt', variantId: 'xl', qty: 5 }])
  cart.setQty('shirt', 'xl', 0)
  assert.equal(cart.getState().count, 3)
  const again = createCartStore({ storage })
  again.load()
  assert.deepEqual(again.getState().lines, [{ productId: 'cap', variantId: null, qty: 3 }])
  assert.deepEqual(seen, [0, 1, 3, 8, 3])
})

test('cart: lines never carry prices, junk in storage is dropped', () => {
  const storage = memoryStorage()
  storage.set('dakio-cart', JSON.stringify([{ productId: 'a', qty: 1, unitPrice: 1 }, { qty: 2 }, { productId: 'b', qty: -1 }, 'x']))
  const cart = createCartStore({ storage })
  cart.load()
  assert.deepEqual(cart.getState().lines, [{ productId: 'a', variantId: null, qty: 1 }])
  storage.set('dakio-cart', '{not json')
  cart.load()
  assert.deepEqual(cart.getState().lines, [])
})

test('bd: 64 districts with thanas; the delivery zone is Dhaka district only', () => {
  assert.equal(DISTRICTS.length, 64)
  assert.ok(DISTRICTS.every(d => THANAS[d]?.length))
  assert.ok(getThanas('Dhaka').includes('Mirpur'))
  assert.deepEqual(getThanas('Nowhere'), ['Nowhere Sadar'])
  for (const d of ['Dhaka', ' dhaka', 'Dhaka District', 'ঢাকা']) assert.equal(deliveryZone(d), 'inside_dhaka', d)
  for (const d of ['Gazipur', 'Narayanganj', '', null]) assert.equal(deliveryZone(d), 'outside_dhaka', String(d))
  assert.deepEqual(detectLocation('House 4, Road 2, Mirpur 10, Dhaka'), { district: 'Dhaka', thana: 'Mirpur' })
  assert.deepEqual(detectLocation('Near Tongi bazar'), { district: 'Gazipur', thana: 'Tongi' })
})

test('bd: phones', () => {
  for (const p of ['01712345678', '+8801712345678', '8801712345678', '017-1234 5678']) assert.equal(normalizeBdPhone(p), '01712345678', p)
  for (const p of ['0171234567', '017123456789', '01212345678', '+14155552671', '']) assert.equal(isBdPhone(p), false, p)
  assert.equal(formatTaka(1250), '৳1,250')
  assert.equal(formatTaka(125000), '৳1,25,000')
  assert.equal(formatTaka(99.5), '৳99.50')
})

test('pixel: ids, params, and no-ops on the server', () => {
  assert.match(newEventId(), /^ev_.{8,}$/)
  assert.notEqual(newEventId(), newEventId())
  assert.deepEqual(productParams({ id: 'p1', name: 'Cap', price: 500 }, 2), { content_ids: ['p1'], content_name: 'Cap', content_type: 'product', value: 1000, currency: 'BDT', num_items: 2 })
  const quote = { total: 1060, currency: 'BDT', lines: [
    { productId: 'cap', qty: 2, unitPrice: 500, problem: null },
    { productId: 'gone', qty: 1, unitPrice: 0, problem: { code: 'NOT_FOUND', message: '' } },
  ] } as unknown as Quote
  assert.deepEqual(purchaseParams(quote).content_ids, ['cap'])
  assert.equal(purchaseParams(quote).num_items, 2)
  trackPixel('Purchase', {}, 'x')   // no window: must not throw
})

const PRODUCT: Product = {
  id: 'p1', slug: 'oxford-shirt', name: 'Oxford Shirt', sku: 'OX', description: '<p>Soft <b>cotton</b> &amp; more</p>', shortDescription: null,
  contentTabs: null, images: ['https://cdn/a.jpg'], price: 800, compareAtPrice: 1000, onSale: true,
  campaign: { id: 'c', name: 'Eid', percent: 20 }, category: { id: 'cat', name: 'Shirts', slug: 'shirts' }, attributes: [],
  stock: { total: 3, inStock: true }, isNew: true, createdAt: '2026-10-01T00:00:00.000Z',
  variants: [{ id: 'v', name: 'XL', sku: null, attrs: [], price: 960, compareAtPrice: 1200, stock: 3, inStock: true }],
}

test('next: product JSON-LD and metadata', () => {
  const ld = productJsonLd(PRODUCT, { name: 'My Brand', currency: 'BDT' }, { url: 'https://mybrand.com.bd/p/oxford-shirt' })
  assert.equal(ld['@type'], 'Product')
  assert.equal(ld.description, 'Soft cotton & more')
  assert.deepEqual(ld.offers, { '@type': 'Offer', priceCurrency: 'BDT', price: 800, availability: 'https://schema.org/InStock', url: 'https://mybrand.com.bd/p/oxford-shirt', itemCondition: 'https://schema.org/NewCondition' })
  assert.equal(jsonLdScript({ a: '</script>' }), '{"a":"\\u003c/script>"}')
  const md = productMetadata(PRODUCT, { name: 'My Brand' }, { url: 'https://x/p/oxford-shirt' })
  assert.deepEqual(md.title, { absolute: 'Oxford Shirt | My Brand' })
  assert.equal(md.alternates.canonical, 'https://x/p/oxford-shirt')
})

test('next: sitemap pages through products; robots', async () => {
  const pages = [
    { data: [PRODUCT], page: 1, limit: 100, total: 2, totalPages: 2 },
    { data: [{ ...PRODUCT, slug: 'cap' }], page: 2, limit: 100, total: 2, totalPages: 2 },
  ]
  const fake = {
    categories: { list: async () => [{ id: 'c1', name: 'Shirts', slug: 'shirts', parentId: null, productCount: 2 }, { id: 'c2', name: 'Empty', slug: 'empty', parentId: null, productCount: 0 }] },
    products: { list: async (q?: { page?: number }) => pages[(q?.page ?? 1) - 1], get: async () => null },
  }
  const urls = (await dakioSitemap(fake, { baseUrl: 'https://mybrand.com.bd/' })).map(e => e.url)
  assert.deepEqual(urls, ['https://mybrand.com.bd/', 'https://mybrand.com.bd/shop', 'https://mybrand.com.bd/shop/shirts', 'https://mybrand.com.bd/p/oxford-shirt', 'https://mybrand.com.bd/p/cap'])
  assert.equal(dakioRobots({ baseUrl: 'https://mybrand.com.bd' }).sitemap, 'https://mybrand.com.bd/sitemap.xml')
  assert.deepEqual(dakioRobots({ baseUrl: 'https://x', noindex: true }), { rules: [{ userAgent: '*', disallow: '/' }] })
})
