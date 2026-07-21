---
applyTo: "**"
---

# Code review instructions — vahinitech/bujo.js

JavaScript library generating customizable bullet-journal PDFs (planners,
trackers, templates). Consumed by `vahinitech/web-live` as a pinned git
submodule — public API changes ripple downstream.

## Security Critical Issues

- No hardcoded secrets or tokens.
- PDF/file generation: check any user-supplied string (template name,
  file path, label text) that reaches a filesystem path or is embedded
  in generated PDF content is validated/sanitized — path traversal and
  malformed-PDF injection are the realistic risks for a library like
  this.
- Dependency changes: check `package-lock.json` is updated consistently
  and no new dependency is added for something a few lines could do.

## Performance Red Flags

- Watch for PDF-generation code that rebuilds large structures per-page
  instead of once (templates, fonts, shared layout data).
- Flag unbounded loops over user-supplied template/tracker configuration
  without a sane limit.

## Code Quality Essentials

- `npm test` (jest) and `npm run lint` (eslint) must pass — a PR without
  a matching test for new behavior in `src/` isn't done.
- Commit messages are commitlint-enforced (`commitlint.config.js`) —
  check conventional format (`feat:`/`fix:`/etc.) before approving.
- **Public API changes are a bigger deal than they look**: this library
  is consumed by `vahinitech/web-live` as a pinned submodule. A changed
  function signature, removed option, or different output shape needs a
  called-out breaking-change note so the pin bump on the other side isn't
  a surprise.

## Review Style

- Be specific and cite the file/line.
- No AI-isms in comments or docs.
- Use the repo's PR template checklist as a real checklist, not
  decoration — confirm tests were actually added/pass, not just that the
  boxes are ticked.
