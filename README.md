# Counselling Cards

Counselling Cards is a browser-based shared card table. Table state is synchronized peer-to-peer with Yjs and WebRTC; no application server is required. Tables are temporary and remain available only while at least one participant stays connected.

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

## GitHub Pages

The `Deploy to GitHub Pages` workflow builds and publishes the app on pushes to `master` and can also be started manually. It configures the project-page asset base for this repository (`/counselling-cards/`). Enable GitHub Pages with **GitHub Actions** as the build and deployment source in repository settings.

The app uses hash-based routes so direct links work on GitHub Pages without server-side URL rewrites. Yjs peers use the configured public WebRTC signaling servers to discover one another; shared table data is exchanged peer-to-peer.

See [Quasar configuration](https://v2.quasar.dev/quasar-cli-vite/quasar-config-file) for build customization.
