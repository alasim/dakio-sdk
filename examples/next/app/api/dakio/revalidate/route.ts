import { revalidatePath, revalidateTag } from 'next/cache'
import { createRevalidateRoute } from '@dakio/sdk/next'

// Dakio calls this the moment a product, its stock or the store changes, and
// the pages it touches are rebuilt on the next visit — instead of waiting for
// the 60-second refresh. Set it up in Dakio → Settings → Developers → Webhooks:
//   URL     https://<your site>/api/dakio/revalidate
//   Events  product.updated, product.deleted, stock.changed, store.updated
// then put the webhook's signing secret (whsec_…) in DAKIO_WEBHOOK_SECRET.
const secret = process.env.DAKIO_WEBHOOK_SECRET

export const POST = secret
  ? createRevalidateRoute({ secret, revalidatePath, revalidateTag })
  : async () => Response.json({ ok: false, error: 'DAKIO_WEBHOOK_SECRET is not set' }, { status: 503 })
