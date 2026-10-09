// The website chat loader: publishable keys only, one script, the right url.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadChat, chatScriptUrl } from '../src/chat.ts'

test('the script lives at the api origin, whatever the sdk base path', () => {
  assert.equal(chatScriptUrl(), 'https://dakio-api-production.up.railway.app/webchat/v1/widget.js')
  assert.equal(chatScriptUrl('http://localhost:5001/api/sdk/v1'), 'http://localhost:5001/webchat/v1/widget.js')
})

test('loadChat adds one script with the key, never a secret key', () => {
  const added: Array<Record<string, string>> = []
  const fakeScript = () => {
    const attrs: Record<string, string> = {}
    return { attrs, async: false, src: '', setAttribute: (k: string, v: string) => { attrs[k] = v } }
  }
  const g = globalThis as unknown as { window?: unknown; document?: unknown }
  g.window = {}
  g.document = {
    querySelector: () => (added.length ? {} : null),
    createElement: () => fakeScript(),
    body: { appendChild: (s: { src: string; attrs: Record<string, string> }) => added.push({ src: s.src, ...s.attrs }) },
  }
  const warn = console.warn
  console.warn = () => {}
  try {
    loadChat({ key: 'dk_sec_live_abcdefghijklmnopqrstuvwx' })
    assert.equal(added.length, 0, 'a secret key is refused')
    loadChat({ key: 'dk_pub_live_abcdefghijklmnopqrstuvwx', lang: 'bn' })
    loadChat({ key: 'dk_pub_live_abcdefghijklmnopqrstuvwx' })
    assert.equal(added.length, 1, 'once per page')
    assert.equal(added[0]['data-key'], 'dk_pub_live_abcdefghijklmnopqrstuvwx')
    assert.equal(added[0]['data-lang'], 'bn')
    assert.match(added[0].src, /\/webchat\/v1\/widget\.js$/)
  } finally {
    console.warn = warn
    delete g.window
    delete g.document
  }
})
