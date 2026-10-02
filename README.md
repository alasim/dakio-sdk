# Dakio SDK

[`@dakio/sdk`](packages/sdk) lets any React or Next.js site run on **Dakio**: catalog, sale prices, cash-on-delivery checkout with fake-order protection, couriers, abandoned-cart recovery, Meta Pixel + Conversions API, and Nova behind your own design.

```
packages/sdk          @dakio/sdk (npm)
examples/react-vite   a complete store in plain React, no backend
examples/next         a complete store in Next.js (server-rendered catalog, sitemap, JSON-LD)
```

Start with the [package README](packages/sdk/README.md).

## Work on it

```bash
npm install
npm test                          # unit tests
npm run build                     # packages/sdk/dist
cp examples/react-vite/.env.example examples/react-vite/.env   # add a dk_pub_test_ key
npm run dev -w dakio-store-react
```

End to end against a real Dakio API (use a **test** key, which never creates real orders):

```bash
DAKIO_E2E_URL=https://<api>/api/sdk/v1 DAKIO_E2E_KEY=dk_pub_test_… npm test
```

## Release

```bash
npm version patch -w @dakio/sdk   # or minor
npm run release                   # publishes packages/sdk; runs typecheck, tests and build first
```

Publishing from the repo root with plain `npm publish` fails: the root is only the workspace container.
