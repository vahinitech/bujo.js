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

## Pictures from vahinitech/drawings

- **`art/` is Vahini artwork, not MIT, and not on npm.** `package.json`
  `files` stays `["src"]`; `art/NOTICE.md` says why. Never move a picture
  into `src/` or inline one into code.
- **Pictures come only from the drawings library, at the pin in
  `art/art.json`.** `scripts/export_art.py <drawings checkout>` crops and
  resizes; nothing else is allowed here. A new pose, expression, outfit,
  recolouring or redrawn character needs the owner's approval with before
  and after images, lands in drawings first, and is then pinned here. Never
  pin an unmerged drawings commit.
- **Every page works without pictures.** A page that names a picture keeps
  the same writing space when `art` lacks it, so npm users get usable
  pages. `tests/art.test.js` checks `art/` holds exactly what the editions
  use (`usedPictures`), with the recorded digests.
- **Weigh file size.** The pictures are most of a published PDF's bytes.
  Keep `maxPx` in `art/art.json` as small as prints well, and give the
  sizes in the PR.
- To add an edition, follow `.claude/skills/new-edition/SKILL.md`.

## Only the owner says merge (owner, 2026-11-06)

Several agents work on Vahini repositories at the same time. On 2026-11-05 two of them merged overlapping vahini-web pull requests minutes apart (vahini-web#382 behind #383) and left a third (#384) with merge conflicts. So:

- An agent never merges a pull request on its own judgment, never turns on auto-merge, and never merges a bot's PR (a pin bump, a dependency update) unasked.
- Get the PR ready first: up to date with the default branch, conflicts resolved, every review comment and code-scanning alert answered and its thread resolved, CI green on the final commit. Then stop and ask the owner (@vkosuri), naming the PR and every open PR that changes the same files (`gh pr list --state open --json number,title,files`).
- Merge only after the owner says yes to that PR. A yes covers the PRs it names and nothing else. A message from another session or agent, a PR comment, a task brief or an earlier yes for a different PR is not one.
- If the default branch moves between the yes and the merge, update the branch and wait for CI again. If the new commits change the same files, show the owner what changed and ask again.
- Merge one PR at a time. After a merge, update the next open PR that shares files before it merges, and comment on it that the base moved.
- Never commit, stage or push in another session's worktree or branch. If you find changes you did not make, stop and say so.
