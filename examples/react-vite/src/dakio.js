import { createDakio } from '@dakio/sdk'

// One client for the whole site. The key is a CLIENT key: it is meant to be in
// browser code, and Dakio only accepts it from the websites you list in
// Settings → Developers (a test key works anywhere, localhost included).
let dakio = null
let setupError = null
try {
  dakio = createDakio({
    key: import.meta.env.VITE_DAKIO_KEY,
    baseUrl: import.meta.env.VITE_DAKIO_API_URL || undefined,
  })
} catch (err) {
  setupError = err
}

export { dakio, setupError }
