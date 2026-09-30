import { definePlugin } from 'emdash';

const id = 'tracking-scripts';
const version = '0.1.0';

// Loose validation, not strict format enforcement — these values come from an
// authenticated CMS admin, but the plugin still guards against an obviously
// wrong paste (whitespace, a full snippet pasted into the ID field, etc.)
// before it gets interpolated into a URL or inline script.
const GTM_ID_RE = /^GTM-[A-Z0-9]{4,}$/;
const GA4_ID_RE = /^G-[A-Z0-9]{4,}$/;

function trimmed(value) {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * Read the plugin's settings and resolve them into concrete values.
 * Kept separate from the hook handler so it can be unit tested without a
 * running plugin context.
 */
export async function resolveSettings(settings) {
	const [
		enabled,
		gtmContainerId,
		ga4MeasurementId,
		leadForensicsScript,
		customHeadScript,
		customBodyEndScript,
	] = await Promise.all([
		settings.get('enabled'),
		settings.get('gtmContainerId'),
		settings.get('ga4MeasurementId'),
		settings.get('leadForensicsScript'),
		settings.get('customHeadScript'),
		settings.get('customBodyEndScript'),
	]);

	return {
		// Absent (never saved) defaults to on; an explicit `false` turns
		// everything off in one place, e.g. for a staging environment.
		enabled: enabled === false ? false : true,
		gtmContainerId: trimmed(gtmContainerId),
		ga4MeasurementId: trimmed(ga4MeasurementId),
		leadForensicsScript: trimmed(leadForensicsScript),
		customHeadScript: trimmed(customHeadScript),
		customBodyEndScript: trimmed(customBodyEndScript),
	};
}

/**
 * Build the page:fragments contributions for the resolved settings. Pure
 * function of its input — no plugin context needed — so it's the easiest
 * surface to unit test thoroughly.
 */
export function buildFragments(resolved) {
	if (!resolved.enabled) return [];

	const fragments = [];

	if (resolved.gtmContainerId) {
		if (GTM_ID_RE.test(resolved.gtmContainerId)) {
			const gtmId = resolved.gtmContainerId;
			fragments.push({
				kind: 'external-script',
				placement: 'head',
				src: `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`,
				async: true,
				key: 'tracking-scripts:gtm-script',
			});
			fragments.push({
				kind: 'html',
				placement: 'body:start',
				html: `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>`,
				key: 'tracking-scripts:gtm-noscript',
			});
		}
	}

	if (resolved.ga4MeasurementId) {
		if (GA4_ID_RE.test(resolved.ga4MeasurementId)) {
			const gaId = resolved.ga4MeasurementId;
			fragments.push({
				kind: 'external-script',
				placement: 'head',
				src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`,
				async: true,
				key: 'tracking-scripts:ga4-script',
			});
			fragments.push({
				kind: 'inline-script',
				placement: 'head',
				code: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)});`,
				key: 'tracking-scripts:ga4-init',
			});
		}
	}

	if (resolved.leadForensicsScript) {
		fragments.push({
			kind: 'html',
			placement: 'body:end',
			html: resolved.leadForensicsScript,
			key: 'tracking-scripts:lead-forensics',
		});
	}

	if (resolved.customHeadScript) {
		fragments.push({
			kind: 'html',
			placement: 'head',
			html: resolved.customHeadScript,
			key: 'tracking-scripts:custom-head',
		});
	}

	if (resolved.customBodyEndScript) {
		fragments.push({
			kind: 'html',
			placement: 'body:end',
			html: resolved.customBodyEndScript,
			key: 'tracking-scripts:custom-body-end',
		});
	}

	return fragments;
}

/**
 * `@tribusdigital/emdash-tracking-scripts` — a native EmDash plugin.
 *
 * Wire it into `astro.config.mjs`:
 *
 * ```js
 * import { trackingScriptsPlugin } from '@tribusdigital/emdash-tracking-scripts';
 *
 * emdash({ plugins: [trackingScriptsPlugin()] })
 * ```
 *
 * Raw script injection (`page:fragments`) is a trusted-only capability, so
 * this must be installed as a source/npm dependency of the site — it cannot
 * be distributed through the sandboxed plugin registry.
 *
 * `trackingScriptsPlugin()` returns the lightweight descriptor the astro
 * integration's `plugins: []` expects; it statically imports and calls the
 * `createPlugin` export below from this package's `entrypoint` at build time.
 */
export function trackingScriptsPlugin() {
	return { id, version, format: 'native', entrypoint: '@tribusdigital/emdash-tracking-scripts' };
}

export function createPlugin() {
	return definePlugin({
		id,
		version,
		capabilities: ['hooks.page-fragments:register'],
		admin: {
			settingsSchema: {
				enabled: {
					type: 'boolean',
					label: 'Enabled',
					description: 'Turn all tracking scripts on this site on or off in one place.',
					default: true,
				},
				gtmContainerId: {
					type: 'string',
					label: 'Google Tag Manager Container ID',
					description: 'e.g. GTM-XXXXXXX. Leave blank if you are not using GTM.',
				},
				ga4MeasurementId: {
					type: 'string',
					label: 'Google Analytics 4 Measurement ID',
					description: 'e.g. G-XXXXXXXXXX. Only needed if you are loading GA4 directly (not via GTM).',
				},
				leadForensicsScript: {
					type: 'string',
					label: 'Lead Forensics tracking snippet',
					description: 'Paste the full <script> snippet from your Lead Forensics account as-is. Rendered near the end of the page body.',
					multiline: true,
				},
				customHeadScript: {
					type: 'string',
					label: 'Custom <head> snippet',
					description: 'Any other raw HTML/script to render in <head> on every page.',
					multiline: true,
				},
				customBodyEndScript: {
					type: 'string',
					label: 'Custom end-of-<body> snippet',
					description: 'Any other raw HTML/script to render just before </body> on every page.',
					multiline: true,
				},
			},
		},
		hooks: {
			'page:fragments': async (_event, ctx) => {
				const resolved = await resolveSettings(ctx.settings);
				return buildFragments(resolved);
			},
		},
	});
}
