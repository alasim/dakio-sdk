/**
 * The store's website chat (DAKIO_WEBCHAT_PLAN.md): the chat bubble the store
 * owner switches on in Dakio → Add-ons → Website chat. Visitors' messages land
 * in the store's Front Office, and Nova answers them.
 *
 *   import { loadChat, openChat } from '@dakio/sdk'
 *   loadChat({ key: 'dk_pub_live_…' })        // once, in the browser
 *   <button onClick={openChat}>Chat with us</button>
 *
 * The bubble draws itself in a shadow root (your CSS cannot reach it) and
 * shows nothing while the owner has chat switched off. Use your PUBLISHABLE
 * key; the page's website must be on the key's allowed list (test keys work
 * anywhere, localhost included).
 */
import { DEFAULT_BASE_URL } from './client.ts'

declare global {
  interface Window { DakioChat?: { open(): void; close(): void } }
}

export interface ChatOptions {
  /** Your publishable key, `dk_pub_live_…` or `dk_pub_test_…`. Never a secret key. */
  key: string
  /** Only if you also pass `baseUrl` to createDakio. */
  baseUrl?: string
  /** Force the bubble's language; by default it follows `<html lang>`. */
  lang?: 'en' | 'bn'
}

const inBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

/** Where the bubble's script lives for an API base url. */
export function chatScriptUrl(baseUrl: string = DEFAULT_BASE_URL): string {
  return `${new URL(baseUrl).origin}/webchat/v1/widget.js`
}

/** Add the chat bubble to the page. Safe to call more than once; a no-op on the server. */
export function loadChat({ key, baseUrl, lang }: ChatOptions): void {
  if (!inBrowser() || window.DakioChat || document.querySelector('script[data-dakio-chat-loader]')) return
  if (!/^dk_pub_(live|test)_[0-9A-Za-z]{24}$/.test(String(key ?? '').trim())) {
    console.warn('[dakio] loadChat needs your publishable key (dk_pub_…). A secret key must never be put in a web page.')
    return
  }
  const s = document.createElement('script')
  s.async = true
  s.src = chatScriptUrl(baseUrl)
  s.setAttribute('data-key', key.trim())
  s.setAttribute('data-dakio-chat-loader', '')
  if (lang) s.setAttribute('data-lang', lang)
  document.body.appendChild(s)
}

/** Open the chat panel (from your own "Chat with us" button). */
export function openChat(): void {
  if (inBrowser()) window.DakioChat?.open()
}

/** Close the chat panel. */
export function closeChat(): void {
  if (inBrowser()) window.DakioChat?.close()
}
