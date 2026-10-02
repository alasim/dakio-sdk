# Dakio store: React (Vite)

A complete store on [`@dakio/sdk`](../../packages/sdk) in plain React, with no backend: home, shop (category, search, sort, pages), product with options, bag priced by Dakio, checkout (district/thana, coupon, delivery by district, the OTP step), order placed, tracking, and "my orders" by phone.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Falasim%2Fdakio-sdk%2Ftree%2Fmain%2Fexamples%2Freact-vite&project-name=my-dakio-store&env=VITE_DAKIO_KEY&envDescription=Your%20Dakio%20key%20(Settings%20%E2%86%92%20Developers))

```bash
cp .env.example .env      # set VITE_DAKIO_KEY (a dk_pub_test_ key while you build)
npm install
npm run dev
```

**Go live:** create a `dk_pub_live_` key in Dakio → Settings → Developers, list your domain under **Allowed websites**, and set `VITE_DAKIO_KEY` on your host. It deploys as a static site anywhere; `vercel.json` sends every path to `index.html`.

Everything visual is in `src/styles.css` and `src/components`. Restyle freely.

Docs: [dakio.io/developers/docs](https://dakio.io/developers/docs).
