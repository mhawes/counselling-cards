# Counselling Cards

Counselling Cards is a browser-based collaborative workspace with shared card tables and timeline tables. Timeline tables let participants add and arrange tokens and editable post-it notes. Trystero uses public Nostr relays for WebRTC peer discovery and signaling; table state is synchronized directly between peers with Yjs. Tables are temporary and remain available only while at least one participant stays connected.

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

## Nostr signaling

The app uses Trystero's Nostr strategy to discover peers and exchange WebRTC connection information. No signaling server, Nostr account, or GitHub Actions secret is needed: Trystero connects to its built-in public relay list by default.

Nostr relays are only used for discovery and signaling. Card data is exchanged directly between participants over WebRTC and is not published to Nostr relays. Relay availability and network conditions can affect how quickly peers connect. Trystero reconnects to relays automatically.

To use a different set of relays, set `relayConfig.urls` in the `joinRoom` configuration in `src/services/yjs.ts` to an array of secure WebSocket (`wss://`) relay URLs. The app's Content Security Policy permits secure WebSocket connections. Public relays see peer-discovery/signaling traffic; actual table state remains peer-to-peer.

**Migration:** remove the old `YJS_SIGNALING_URL` GitHub Actions variable if you set it. No Worker deployment or local signaling process is required anymore; install dependencies and run the app as usual.

## GitHub Pages

The `Deploy to GitHub Pages` workflow builds and publishes the app on pushes to `master` and can also be started manually. It configures the project-page asset base for this repository (`/counselling-cards/`). Enable GitHub Pages with **GitHub Actions** as the build and deployment source in repository settings.

The app uses hash-based routes so direct links work on GitHub Pages without server-side URL rewrites. The Pages workflow needs no signaling-specific repository variables.

See [Quasar configuration](https://v2.quasar.dev/quasar-cli-vite/quasar-config-file) for build customization.
