# Counselling Cards

Counselling Cards is a browser-based shared card table. A Cloudflare Worker is used for best-effort WebRTC peer discovery/signaling; table state is synchronized peer-to-peer with Yjs and WebRTC. Tables are temporary and remain available only while at least one participant stays connected.

## Local development

Install Node.js 22.12 or later and npm, then run:

```sh
npm ci
npm run dev
```

## Checks and production build

```sh
npm run typecheck
npm run lint:check
npm run build
```

The production build is written to `dist/spa`.

## Cloudflare Worker signaling

The file [`cloudflare/signaling/worker.js`](cloudflare/signaling/worker.js) is a standalone Cloudflare Worker module. Paste its contents into your Worker script or deploy it directly. It accepts a WebSocket at `/<FIVE_LETTER_ROOM_CODE>`, speaks the y-webrtc signaling protocol, and responds to `/health`.

```sh
npx wrangler@latest login
npx wrangler@latest deploy cloudflare/signaling/worker.js --name counselling-cards-signaling
```

Set the GitHub repository Actions variable `YJS_SIGNALING_URL` to your Worker URL, such as `wss://counselling-cards-signaling.<account>.workers.dev`, so the Pages build connects to it. For local development, run `npx wrangler@latest dev cloudflare/signaling/worker.js`, add `VITE_YJS_SIGNALING_URL=ws://localhost:8787` to `.env.local`, and start the app. The app adds each table code to the URL path automatically.

**Important limitation:** this standard Worker uses an in-memory room map. Cloudflare does not share that map between Worker isolates or guarantee that clients connect to the same isolate. As a result, clients on different devices may not discover one another, and reconnects/deployments clear room membership. This is best-effort only, not a reliable production signaling service. A reliable room relay needs shared coordination/state, which a plain Worker by itself does not provide.

The Worker stores no table content; it relays WebRTC signaling messages, while card state remains exchanged directly between peers. Cloudflare's default `workers.dev` hostname is permitted by the app's Content Security Policy. If you use a custom domain, add its `wss://` host to the `connect-src` directive in `index.html`.

Run `npm run test:signaling` to exercise the worker's room relay behavior.

## GitHub Pages

The `Deploy to GitHub Pages` workflow builds and publishes the app on pushes to `master` and can also be started manually. It configures the project-page asset base for this repository (`/counselling-cards/`). Enable GitHub Pages with **GitHub Actions** as the build and deployment source in repository settings.

The app uses hash-based routes so direct links work on GitHub Pages without server-side URL rewrites. Set the `YJS_SIGNALING_URL` repository variable before deploying so other devices use your Cloudflare signaling worker.

See [Quasar configuration](https://v2.quasar.dev/quasar-cli-vite/quasar-config-file) for build customization.
