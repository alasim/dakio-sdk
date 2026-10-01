# Dakio store: Next.js

A complete store on [`@dakio/sdk`](../../packages/sdk) with the App Router. Catalog pages are rendered on the server (refreshed from Dakio every minute) with product JSON-LD, canonical links, a sitemap and robots.txt. The bag, checkout (with the OTP step), tracking and "my orders" run in the browser.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Falasim%2Fdakio-sdk%2Ftree%2Fmain%2Fexamples%2Fnext&project-name=my-dakio-store&env=NEXT_PUBLIC_DAKIO_KEY,NEXT_PUBLIC_SITE_URL&envDescription=Your%20Dakio%20key%20(Settings%20%E2%86%92%20Developers)%20and%20your%20site%27s%20address)

```bash
cp .env.example .env.local    # set NEXT_PUBLIC_DAKIO_KEY (a dk_pub_test_ key while you build)
npm install
npm run dev
```

**Go live:** create a `dk_pub_live_` key in Dakio → Settings → Developers, list your domain under **Allowed websites**, and set `NEXT_PUBLIC_DAKIO_KEY` and `NEXT_PUBLIC_SITE_URL` on Vercel.

The same key is used by server components (catalog) and the browser (checkout). It's a client key, made to be public. Checkout stays in the browser so Dakio's fake-order protection sees each buyer's own IP.
