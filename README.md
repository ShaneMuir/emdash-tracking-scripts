# @tribusdigital/emdash-tracking-scripts

[![CI](https://github.com/ShaneMuir/emdash-tracking-scripts/actions/workflows/ci.yml/badge.svg)](https://github.com/ShaneMuir/emdash-tracking-scripts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

A native [EmDash CMS](https://emdashcms.com) plugin that injects third-party tracking and analytics scripts — Google Tag Manager, GA4/gtag, Lead Forensics, and any other raw snippet — site-wide, with an admin-configurable settings screen so a non-technical SEO user can manage tracking IDs without a developer or a deploy.

## Why a native plugin, not a registry install

Raw `<script>` injection into `<head>`/`<body>` is only available through EmDash's `page:fragments` hook, which is **trusted-only** and explicitly excluded from the sandboxed plugin registry. This package must be installed as a normal npm dependency of your site and wired into `astro.config.mjs` — it cannot be installed from inside the CMS admin's plugin browser.

## Install

```sh
npm install @tribusdigital/emdash-tracking-scripts
```

```js
// astro.config.mjs
import { trackingScriptsPlugin } from '@tribusdigital/emdash-tracking-scripts';
import emdash from 'emdash/astro';

export default defineConfig({
	integrations: [
		emdash({
			plugins: [trackingScriptsPlugin()],
			// ...your existing database/storage config
		}),
	],
});
```

Your site's layout must already render `<EmDashHead>`, `<EmDashBodyStart>`, and `<EmDashBodyEnd>` from `emdash/ui` (this is the standard EmDash site setup) — the plugin's fragments render through those.

## Configure

Once installed and deployed, an **Analytics & Tracking** settings screen appears in the EmDash admin (auto-generated from the plugin's settings schema — no extra admin code to build or maintain). Available fields:

| Field | What it does |
| --- | --- |
| **Enabled** | Master on/off switch for every tracking script on the site. |
| **Google Tag Manager Container ID** | e.g. `GTM-XXXXXXX`. Adds the standard GTM `<script>` in `<head>` and the `<noscript>` fallback at the start of `<body>`. |
| **Google Analytics 4 Measurement ID** | e.g. `G-XXXXXXXXXX`. Only needed if loading GA4 directly rather than through GTM. Adds `gtag.js` plus the init snippet. |
| **Lead Forensics tracking snippet** | Paste the full `<script>` snippet from your Lead Forensics account as-is. Rendered near the end of `<body>`. |
| **Custom `<head>` snippet** | Any other raw HTML/script for `<head>` on every page. |
| **Custom end-of-`<body>` snippet** | Any other raw HTML/script just before `</body>` on every page. |

Values are stored via EmDash's plugin settings API and take effect immediately — no rebuild or redeploy needed to change a tracking ID.

GTM and GA4 IDs are validated against their expected format (`GTM-...` / `G-...`) before being used; anything that doesn't match is silently skipped rather than emitted as a broken script tag. The Lead Forensics and custom snippet fields are rendered verbatim — they're plugin settings editable only by whoever has admin/plugin-settings access in your CMS, the same trust level as WordPress's "insert headers and footers" style plugins.

## Development

```sh
npm install
npm test
```

`index.mjs` separates the pure fragment-building logic (`buildFragments`, `resolveSettings`) from the `definePlugin()` wiring, so the tracking-tag output is fully unit tested without needing a running EmDash instance.

## Contributing

This plugin is deliberately kept small, dependency-free, and thoroughly tested so it stays trustworthy as trusted-authority code — that's also what makes it a good base to build on rather than reinvent. If it's missing an integration you need (a platform, a consent-mode toggle, per-page opt-out, etc.), we'd much rather have that as a PR here than see a dozen narrower forks. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the ground rules, and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for how we expect people to treat each other while doing it. Issues and PRs welcome.

## License

MIT — see [LICENSE](./LICENSE). Free to use, fork, and build on.
