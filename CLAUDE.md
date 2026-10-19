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
- **Never write a malware-scanner signature in one piece.** The server's
  nightly maldet scan reads home folders and `/tmp`, build output included.
  Build a test payload at run time with a call (`[...].join('')`,
  `Buffer.concat`), never `+` of two literals, which bundlers and minifiers
  fold into one string; keep the joined form out of comments and docs; never
  name a file like a web shell (`shell.php`). `tests/scanner-strings.test.js`
  checks every tracked file. Full rule:
  [scanner-strings](https://github.com/vahinitech/Umbrella/blob/main/skills/scanner-strings/SKILL.md).

## Commands

```bash
npm test        # jest (jest.config.js; babel via babel.config.js)
npm run lint    # eslint src/ tests/
```

Run both before every commit. A change without a matching test isn't done —
add or update tests in `tests/` alongside the code change.

## Consumers: breaking changes ripple

- **vahinitech/vahini-web** (vahinitech.com; renamed from `web-live`)
  consumes this library at a pinned commit. What it uses is the output of
  `scripts/build-printables.mjs`: the PDFs in `dist/printables/` and their
  `manifest.json`. The file names (`<edition id>-<paper>.pdf`), the
  edition ids and the manifest fields (`generator`, `version`, `commit`,
  `footer`, and per file `id`, `title`, `description`, `paper`, `pages`,
  `file`, `bytes`, `sha256`) are a contract: renaming or removing one is a
  breaking change (`feat!:`) and needs a coordinated pin bump in
  vahini-web. A changed page count or layout changes the published PDFs,
  so call it out in the PR. Builds must stay deterministic: the same
  commit and options give byte-identical PDFs. Nothing here reaches the
  live site until vahini-web moves its pin.
