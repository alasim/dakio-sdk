# Dakio store: React (Vite)

A complete store on [`@dakio/sdk`](../../packages/sdk) in plain React, with no backend: home, shop (category, search, sort, pages), product with options, bag priced by Dakio, checkout (district/thana, coupon, delivery by district, the OTP step), order placed, tracking, and "my orders" by phone.

```bash
cp .env.example .env      # set VITE_DAKIO_KEY (a dk_pub_test_ key while you build)
npm install
npm run dev
```

**Go live:** create a `dk_pub_live_` key in Dakio → Settings → Developers, list your domain under **Allowed websites**, and set `VITE_DAKIO_KEY` on your host. It deploys as a static site anywhere; `vercel.json` sends every path to `index.html`.

Everything visual is in `src/styles.css` and `src/components`. Restyle freely.
