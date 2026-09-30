import { describe, it, expect, vi } from 'vitest';
import { buildFragments, resolveSettings, trackingScriptsPlugin, createPlugin } from './index.mjs';

function fakeSettings(values) {
	return { get: vi.fn(async (key) => (key in values ? values[key] : null)) };
}

describe('resolveSettings', () => {
	it('defaults enabled to true when never saved', async () => {
		const resolved = await resolveSettings(fakeSettings({}));
		expect(resolved.enabled).toBe(true);
	});

	it('respects an explicit false for enabled', async () => {
		const resolved = await resolveSettings(fakeSettings({ enabled: false }));
		expect(resolved.enabled).toBe(false);
	});

	it('trims string settings and tolerates non-string/null values', async () => {
		const resolved = await resolveSettings(
			fakeSettings({ gtmContainerId: '  GTM-ABC123  ', ga4MeasurementId: null }),
		);
		expect(resolved.gtmContainerId).toBe('GTM-ABC123');
		expect(resolved.ga4MeasurementId).toBe('');
	});
});

describe('buildFragments', () => {
	const base = {
		enabled: true,
		gtmContainerId: '',
		ga4MeasurementId: '',
		leadForensicsScript: '',
		customHeadScript: '',
		customBodyEndScript: '',
	};

	it('returns nothing when disabled, even with values set', () => {
		expect(buildFragments({ ...base, enabled: false, gtmContainerId: 'GTM-ABC123' })).toEqual([]);
	});

	it('returns nothing when no fields are configured', () => {
		expect(buildFragments(base)).toEqual([]);
	});

	it('emits the GTM script and noscript fragments for a valid container ID', () => {
		const fragments = buildFragments({ ...base, gtmContainerId: 'GTM-ABC123' });
		expect(fragments).toEqual([
			{
				kind: 'external-script',
				placement: 'head',
				src: 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC123',
				async: true,
				key: 'tracking-scripts:gtm-script',
			},
			{
				kind: 'html',
				placement: 'body:start',
				html: '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-ABC123" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>',
				key: 'tracking-scripts:gtm-noscript',
			},
		]);
	});

	it('silently skips a malformed GTM ID rather than emitting a broken script', () => {
		expect(buildFragments({ ...base, gtmContainerId: '<script>alert(1)</script>' })).toEqual([]);
		expect(buildFragments({ ...base, gtmContainerId: 'not-a-real-id' })).toEqual([]);
	});

	it('emits gtag.js and the init snippet for a valid GA4 measurement ID', () => {
		const fragments = buildFragments({ ...base, ga4MeasurementId: 'G-ABC1234567' });
		expect(fragments).toEqual([
			{
				kind: 'external-script',
				placement: 'head',
				src: 'https://www.googletagmanager.com/gtag/js?id=G-ABC1234567',
				async: true,
				key: 'tracking-scripts:ga4-script',
			},
			{
				kind: 'inline-script',
				placement: 'head',
				code: "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',\"G-ABC1234567\");",
				key: 'tracking-scripts:ga4-init',
			},
		]);
	});

	it('silently skips a malformed GA4 ID', () => {
		expect(buildFragments({ ...base, ga4MeasurementId: 'UA-12345-1' })).toEqual([]);
	});

	it('passes the Lead Forensics snippet through verbatim, placed at body:end', () => {
		const snippet = '<script>/* lead forensics */</script>';
		expect(buildFragments({ ...base, leadForensicsScript: snippet })).toEqual([
			{ kind: 'html', placement: 'body:end', html: snippet, key: 'tracking-scripts:lead-forensics' },
		]);
	});

	it('passes custom head and body-end snippets through verbatim', () => {
		const fragments = buildFragments({
			...base,
			customHeadScript: '<meta name="custom" content="head">',
			customBodyEndScript: '<script>console.log("bye")</script>',
		});
		expect(fragments).toEqual([
			{
				kind: 'html',
				placement: 'head',
				html: '<meta name="custom" content="head">',
				key: 'tracking-scripts:custom-head',
			},
			{
				kind: 'html',
				placement: 'body:end',
				html: '<script>console.log("bye")</script>',
				key: 'tracking-scripts:custom-body-end',
			},
		]);
	});

	it('combines every configured integration in one call', () => {
		const fragments = buildFragments({
			enabled: true,
			gtmContainerId: 'GTM-ABC123',
			ga4MeasurementId: 'G-ABC1234567',
			leadForensicsScript: '<script>lf</script>',
			customHeadScript: '<meta name="a" content="b">',
			customBodyEndScript: '<script>c</script>',
		});
		expect(fragments.map((f) => f.key)).toEqual([
			'tracking-scripts:gtm-script',
			'tracking-scripts:gtm-noscript',
			'tracking-scripts:ga4-script',
			'tracking-scripts:ga4-init',
			'tracking-scripts:lead-forensics',
			'tracking-scripts:custom-head',
			'tracking-scripts:custom-body-end',
		]);
	});
});

describe('plugin wiring', () => {
	it('trackingScriptsPlugin() returns a lightweight native descriptor with a resolvable entrypoint', () => {
		const descriptor = trackingScriptsPlugin();
		expect(descriptor).toEqual({
			id: 'tracking-scripts',
			version: expect.any(String),
			format: 'native',
			entrypoint: '@tribusdigital/emdash-tracking-scripts',
		});
	});

	it('createPlugin() declares the page-fragments capability and a page:fragments hook', () => {
		// definePlugin() normalizes each hook into a { handler, priority, ... }
		// wrapper (see emdash's resolveHooks) — the raw function lives at .handler.
		const plugin = createPlugin();
		expect(plugin.capabilities).toContain('hooks.page-fragments:register');
		expect(typeof plugin.hooks['page:fragments'].handler).toBe('function');
		expect(Object.keys(plugin.admin.settingsSchema)).toEqual([
			'enabled',
			'gtmContainerId',
			'ga4MeasurementId',
			'leadForensicsScript',
			'customHeadScript',
			'customBodyEndScript',
		]);
	});

	it('the page:fragments hook reads settings and returns fragments end to end', async () => {
		const plugin = createPlugin();
		const ctx = { settings: fakeSettings({ gtmContainerId: 'GTM-ABC123' }) };
		const result = await plugin.hooks['page:fragments'].handler(
			{ page: /** @type {any} */ ({}) },
			/** @type {any} */ (ctx),
		);
		expect(result).toHaveLength(2);
		expect(result[0].kind).toBe('external-script');
	});
});
