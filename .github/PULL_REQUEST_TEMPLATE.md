## What does this change?

## Why?

(Link the issue this closes, if any: `Closes #123`)

## Checklist

- [ ] `npm test` passes
- [ ] New/changed behavior has test coverage (valid input, invalid/malformed input, and the "not configured" no-op case where relevant)
- [ ] `buildFragments()` stayed a pure function — no `ctx`/I/O added to it
- [ ] No new runtime dependency was added (or, if one was, it's justified in this description)
- [ ] README updated if this adds/changes a settings field or public behavior
