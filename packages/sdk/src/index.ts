/**
 * @dakio/sdk — build any store on Dakio.
 *
 *   import { createDakio } from '@dakio/sdk'
 *   const dakio = createDakio({ key: 'dk_pub_live_…' })
 *   const { data } = await dakio.products.list({ limit: 24 })
 *
 * Subpaths: '@dakio/sdk/react' (cart, checkout hooks), '@dakio/sdk/next'
 * (sitemap, robots, JSON-LD, the webhook revalidate route), '@dakio/sdk/bd'
 * (districts, phones), '@dakio/sdk/pixel' (Meta Pixel event ids),
 * '@dakio/sdk/webhooks' (verifyWebhook, on your server). The store's chat
 * bubble: loadChat({ key }) and openChat().
 */
export { createDakio, DEFAULT_BASE_URL } from './client.ts'
export type { Dakio, DakioOptions } from './client.ts'
export { DakioError, isDakioError } from './errors.ts'
export { createCartStore } from './cart.ts'
export { loadChat, openChat, closeChat, chatScriptUrl } from './chat.ts'
export type { ChatOptions } from './chat.ts'
export type { CartStore, CartState, CartStorage } from './cart.ts'
export * from './types.ts'
