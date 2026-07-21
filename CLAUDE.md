# CLAUDE.md — bujo.js (bullet-journal JS library)

## Working rules (apply to every change)

- **Verify before claiming.** Read `src/` before describing behaviour;
  never invent APIs or options. If unsure whether something exists,
  grep it, don't guess.
- **Never copy another project's code into this repo — reference it,
  don't paste it.** If an external library/snippet is genuinely needed,
  add it as a real npm dependency (with its own license intact) or
  reimplement independently, not by pasting source. If literal reuse of
  someone else's non-package code is truly unavoidable, get the original
  author's explicit consent first and record it in the commit/PR.
  Unattributed code reuse is an IP risk, and it applies with extra force
  to AI-assisted changes, since a model can reproduce code it saw during
  training without anyone noticing the provenance.
- **Conventional commits — enforced.** `commitlint.config.js` is active;
  a non-conforming message fails the pipeline. `feat:`, `fix:`, `docs:`,
  `test:`, `chore:`; imperative mood; body explains why.
- **Build and test before every commit; pipeline green before merge.**
- **Docs-only changes skip the test pipeline** — `ci.yml` has
  `paths-ignore: ['**/*.md', 'docs/**']`; a PR touching only markdown never
  triggers it. `commitlint.yml` runs regardless — it checks the commit
  message, not files, and is cheap either way.
- **No AI-isms** in docs, comments, or commit messages — plain, specific
  language only.

## Commands

```bash
npm test        # jest (jest.config.js; babel via babel.config.js)
npm run lint    # eslint src/ tests/
```

Run both before every commit. A change without a matching test isn't done —
add or update tests in `tests/` alongside the code change.

## Consumers — breaking changes ripple

- **vahinitech/web-live** consumes this library as a pinned git submodule.
  Any public-API or output change requires bumping web-live's submodule
  pin in a coordinated PR there, and its e2e suite is the integration
  gate. Never assume a change here reaches the live site by itself —
  web-live's pin controls what ships.
