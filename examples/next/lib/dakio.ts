import { createDakio, type Dakio } from '@dakio/sdk'

// One client for server components and the browser alike. It holds a CLIENT
// key (dk_pub_…), which is made to be public: catalog pages read with it on the
// server, and checkout runs with it in the browser so Dakio sees each buyer's
// own IP for fake-order protection.
function make(): { dakio: Dakio | null; setupError: string | null } {
  try {
    return {
      dakio: createDakio({ key: process.env.NEXT_PUBLIC_DAKIO_KEY || '', baseUrl: process.env.NEXT_PUBLIC_DAKIO_API_URL || undefined }),
      setupError: null,
    }
  } catch (err) {
    return { dakio: null, setupError: (err as Error).message }
  }
}

const made = make()
export const setupError = made.setupError
export const dakio = made.dakio as Dakio   // pages render <Setup/> first when it's null

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
