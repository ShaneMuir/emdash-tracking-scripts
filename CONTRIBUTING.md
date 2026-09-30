# Contributing

Thanks for considering a contribution — this project is intentionally kept small and dependency-light so it stays trustworthy as a piece of code that runs with full site authority in every EmDash site that installs it. Contributions that add real, common integrations (another analytics/marketing platform, a consent-mode mode, etc.) are very welcome; contributions that grow the surface area for narrow use cases are probably better as your own fork or a separate plugin.

## Before you open a PR

- **Open an issue first** for anything beyond a small fix or docs tweak, so we can agree on the approach before you put time into it.
- Keep `buildFragments()` a pure function of its resolved settings — no `ctx`, no I/O. That's what keeps the whole integration surface unit-testable without a running EmDash instance.
- New integrations should follow the existing pattern: a settings field (or fields) in `admin.settingsSchema`, validation for anything that gets interpolated into a URL or inline script, and full test coverage in `index.test.mjs` (valid input, invalid/malformed input, and the "not configured" no-op case).
- Don't add a dependency unless the feature genuinely needs one. This plugin has zero runtime dependencies beyond `emdash` itself — keep it that way if at all possible.

## Development

```sh
npm install
npm test
```

`npm test` runs the full suite with `vitest`. There's no build step — `index.mjs` is shipped as-is.

## Reporting a security issue

Raw script injection is inherently sensitive — if you find a way for this plugin to be tricked into emitting a fragment from anything other than deliberately-saved admin settings, please don't open a public issue. Instead, see the security contact in `package.json`, or open a private GitHub security advisory on this repo.

## Code of conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).
