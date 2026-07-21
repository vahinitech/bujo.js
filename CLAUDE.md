# CLAUDE.md — bujo.js (bullet-journal JS library)

## Working rules (apply to every change)

- **Verify before claiming.** Read `src/` before describing behaviour;
  never invent APIs or options. If unsure whether something exists,
  grep it, don't guess.
- **Conventional commits — enforced.** `commitlint.config.js` is active;
  a non-conforming message fails the pipeline. `feat:`, `fix:`, `docs:`,
  `test:`, `chore:`; imperative mood; body explains why.
- **Build and test before every commit; pipeline green before merge.**
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
