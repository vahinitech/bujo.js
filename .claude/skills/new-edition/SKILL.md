---
name: new-edition
description: Use when adding or reworking a printable edition in bujo.js (a journal, planner or diary for children, teachers, lawyers, doctors or any other reader), when adding a page type for one, or when putting Vahini's drawings on its pages. Covers choosing pages, words, pictures from vahinitech/drawings, page counts, tests, the build and the vahini-web follow-up.
---

# Add or rework a printable edition

An edition is a ready-made book: an entry in `EDITIONS` and a composer in
`COMPOSERS` (`src/editions.js`), built from page methods on
`BulletJournal`. vahinitech.com publishes every edition the build script
writes, so an edition is a product page in waiting. Read `CLAUDE.md` first.

## 1. Decide what the reader writes

Start from the reader's week, not from the page types we have. For each
page, name what they will write on it and how often. A teacher fills an
attendance register daily and a marks register a few times a term; an
advocate needs the next date of every matter more than anything else.
Every page must leave room to write by hand: that is what the site sells.

For children, every activity page asks the child to write something
(a guess, an idea, a sentence about a picture), so it is handwriting
practice too. Keep anything a child does at home safe and supervised
("with a grown-up nearby"), and give no health, safety or legal advice
beyond what any school, family or court diary would print.

## 2. Reuse pages before writing new ones

Pages that exist (search `add.*Page(` in `src/`):

- General: name cover (with pictures), how to use, dot grid, habit
  tracker, year at a glance, daily plan, weekly overview, reading log.
- Children (`src/pages/kids.js`): handwriting practice, practice tracker,
  all about me, phone number to learn, my way home, experiment, ideas,
  tricks, drawing, colour mixing, finishing page.
- Records (`src/pages/records.js`): table (any columns, shares adding up
  to 1), register (attendance numbered 1 to 31, or marks with a max-marks
  row and total), timetable, lesson plan, notes on each child, case note,
  section divider, prompted notes.

A new page type goes in `src/pages/`, takes `(doc, paperDimensions, opts)`,
starts with `this._newPage(doc)`, ends with `this._footer(...)`, lays out
everything from `this._layout(...)` (millimetres scaled by `L.s`, fonts by
`this._fonts(L)`), and drops a block rather than drawing past `L.bottom`.

## 3. Words

Printed words go in `src/editionText.js`. Plain sentences, one idea each,
no em dashes, nothing that reads as machine-written. Check facts you print
(a times-table trick, a date rule, a direction) by working them through.

## 4. Pictures

Pictures come only from `vahinitech/drawings`, at the commit pinned in
`art/art.json`. Read that library's `CHARACTER-GUIDE.md` and use-case
guide: who each character is, and what a scene may and may not claim.

1. Pick existing components from the library's `catalogue.json` and look
   at them (open the PNG). Prefer a character whose role fits the page:
   Chinnu experiments, Pihu notices, Tara is patient, Vidhya teaches.
2. Add `{ "id": "<component id>", "maxPx": <size> }` to `art/art.json`
   `items`, and its collection to `source.collections` if new. Sizes now
   in use: 560 for covers, 520 for section dividers, 380 for page corners.
3. Run `python3 scripts/export_art.py <clean drawings checkout at the pin>`
   (Python 3 with Pillow). It runs the library's check, verifies each
   master against the catalogue, crops, resizes and records digests. On
   Windows the library's check needs POSIX paths: run
   `python3 scripts/check.py` in the drawings checkout under WSL, then
   pass `--library-checked`.
4. Name the ids on pages (`picture: '<id>'`) or covers (`COVER_PICTURES`).

Crop and resize only. A new pose, expression, prop, recolouring or a
drawing from anywhere else needs the owner's approval with before and
after images, and goes into the drawings library first. Never pin an
unmerged drawings commit.

## 5. Wire it up

- `EDITIONS`: `id` (kebab-case, permanent: it is the PDF file name and a
  vahini-web contract), `title`, one-sentence `description` ending in a
  full stop, `pages`, `papers: EDITION_PAPERS`.
- `COVER_PICTURES[id]` and a composer in `COMPOSERS[id]`.
- Set `pages` from a real build:
  `node -e "import('./src/bujo.js').then(m => console.log(m.buildEdition('<id>', 'A4').getNumberOfPages()))"`.

## 6. Test and look

- Add the edition to the id list and page counts in `tests/editions.test.js`.
- Add every new page method to `PAGE_METHODS` in `tests/pages.test.js`
  (bounds on A6 to A3, with pictures) and to the missing-document list.
- `npm test` and `npm run lint`. `tests/art.test.js` fails if `art/` and
  the editions' pictures disagree.
- Build (`node scripts/build-printables.mjs --out /tmp/p --footer "Free handwriting check: vahinitech.com"`)
  and render pages to images (pypdfium2) on A4 and A5. Look at every new
  page type: overlaps, crowded text, empty halves, pictures standing on
  the right line. Fix what you see; tests cannot see taste.
- Report each PDF's size in the PR.

## 7. After merge: vahini-web

Nothing reaches vahinitech.com until vahini-web moves its pin. After the
bujo.js PR is merged on `main` (never before), in vahini-web:
`tools/sync-printables.mjs <clean bujo.js checkout>`, add the edition's
words to `tools/printables-data.mjs` (it gets no page without them), run
`tools/gen-printables.mjs`, and update `llms.txt` and the sitemap as that
repository's rules say.
