# BulletJournal.js

![Build Status](https://github.com/vahinitech/bujo.js/actions/workflows/ci.yml/badge.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D20.8.1-green)

`bujo.js` is a customizable library for generating Bullet Journal-style PDFs using JavaScript. It enables users to create organized PDF templates with customizable options, such as cover pages, milestones, undated calendars, planning pages, and more.

The layout engine is fully metric (millimetres) and scale-aware: every page — cover, index, future log, milestones, year at a glance and the monthly planning sections — is laid out relative to the selected paper size, so the same journal renders correctly from A6 pocket books up to A3 desk planners.

## Features

- **Cover Page**: A clean typographic cover with a delicate double frame and year fill-in.
- **Index Page**: A two-column index pre-filled with the real page number of every generated section.
- **Future Log**: An intro page plus twelve undated month pages with true 7×6 calendar grids and notes.
- **Milestones**: Top 30 milestones (two columns of checkbox rows) and a top 10 yearly milestones page.
- **Year at a Glance**: Twelve mini month panels for a helicopter view of the year.
- **Dotted Grid Pages**: Classic 5 mm bullet-journal dot grid across the full content area.
- **Daily Plan**: Morning/afternoon/evening time blocks, top priorities, to-dos and a dotted notes band.
- **Weekly Overview**: Seven day panels plus an accented Goals & Habits panel.
- **Habit Tracker**: A 31-day × 8-habit matrix with goal-setting and flexible tracking space.
- **Handwriting Practice**: Four-line copybook ruling with a shaded middle band, as used in Indian schools.
- **Pages for Children and Students**: Reading log, weekly study planner, 30-day practice tracker and a name cover.
- **Activity Pages for Children**: All about me, a phone number to learn, the way home, experiments, ideas, everyday tricks, drawing and colour mixing. Each one asks the child to write.
- **Record Pages**: Ruled tables, attendance and marks registers, a timetable, a weekly lesson plan, notes on each child, case notes, section dividers.
- **Pictures**: An `art` option draws Vahini's illustrations on covers and pages, and every page also works without them.
- **Printable Editions**: Seven ready-made books, including a teacher's planner and an advocate's case diary, and a build script that writes them, with a manifest, as byte-identical PDFs.
- **Color Schemes**: A refined `color` palette (slate ink, muted petrol accent) and a `monochrome` palette.
- **Browser and Node**: `createBulletJournalBook()` saves a download in the browser; `generate()` returns the jsPDF document so services can stream it (`doc.output('arraybuffer')`).

## Installation

```bash
npm install github:vahinitech/bujo.js
```

or clone the repository:

```bash
git clone https://github.com/vahinitech/bujo.js.git
cd bujo.js && npm install
```

The package is ESM (`"type": "module"`); import it with:

```javascript
import { BulletJournal, PAPER_SIZES } from 'bujo.js';
```

## Usage

### Creating a New Bullet Journal

```javascript
const journal = new BulletJournal('My Custom Journal', 'monochrome');
```

### Generating the Full Book

In the browser (triggers a download):

```javascript
journal.createBulletJournalBook('A4');
```

In Node (e.g. an HTTP service):

```javascript
const doc = journal.generate('A4');
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
```

Supported paper sizes (portrait, millimetres): `A3` (297×420), `A4` (210×297), `A5` (148×210), `A6` (105×148).

### Composing Individual Sections

Every page method draws onto a jsPDF document. Create one with the right physical page size via `createDocument`, then add the sections you want:

```javascript
const doc = journal.createDocument('A5');
const paper = PAPER_SIZES.A5;

journal.addCoverPage(doc, paper);
journal.addIndexPage(doc, paper);
journal.addTopMilestonesPage(doc, paper);
journal.addDottedGridPage(doc, 5, paper);       // 5 mm dot spacing
journal.addDailyPlanningPage(doc, paper);
journal.addWeeklyOverviewPage(doc, paper);
journal.addFlexibleTrackingPage(doc, paper);

doc.save('custom_journal.pdf');
```

Legacy inch-based dimensions (e.g. `{ width: 8.27, height: 11.69 }`) and inch dot spacings (`0.2`) are detected and converted automatically for backwards compatibility.

### Methods Summary

| Method | Description |
|--------|-------------|
| `generate(paperSize, doc?)` | Builds the full journal, returns the jsPDF document (no save) |
| `createBulletJournalBook(paperSize, doc?)` | Builds the full journal and saves it |
| `createDocument(paperSize)` | Creates a jsPDF document with the correct physical page size |
| `getExpectedPageCount()` | Total pages of a full book (66) |
| `addCoverPage(doc, paper?)` | Cover on the current page |
| `addIndexPage(doc, paper?)` | Index with real section page numbers |
| `addUndatedCalendarPages(doc, paper?)` | Future log intro + 12 undated month calendars |
| `addTopMilestonesPage(doc, paper?)` | Top 30 + top 10 yearly milestones (2 pages) |
| `addHelicopterOverviewPage(doc, paper?)` | Year at a glance |
| `addDottedGridPage(doc, spacingMm, paper)` | Full-page dot grid |
| `addDailyPlanningPage(doc, paper)` | Daily plan |
| `addWeeklyOverviewPage(doc, paper)` | Weekly overview |
| `addFlexibleTrackingPage(doc, paper, opts?)` | Habit tracker + goals; `opts.kicker`, `opts.monthLine` |
| `addNameCoverPage(doc, paper, opts?)` | Cover with a "This journal belongs to" line, on the current page |
| `addHowToUsePage(doc, paper, opts?)` | Numbered instructions, optional key to the four lines |
| `addHandwritingPracticePage(doc, paper, opts?)` | Four-line handwriting ruling |
| `addReadingLogPage(doc, paper)` | Reading log with stars to colour in |
| `addStudyPlannerPage(doc, paper, opts?)` | One school week with goal and exams boxes |
| `addPracticeTrackerPage(doc, paper, opts?)` | 30-day practice tracker |

### Pages for Children and Students

These draw on the same document as the other sections and follow the same margins and colour scheme on every paper size.

```javascript
const doc = journal.createDocument('A4');
const paper = PAPER_SIZES.A4;

journal.addNameCoverPage(doc, paper, {
    title: 'My Handwriting Journal',
    subtitle: 'Ten minutes a day of careful writing',
    kicker: 'Practice Every Day'
});
journal.addHandwritingPracticePage(doc, paper, { title: 'Letters a to m' });
journal.addReadingLogPage(doc, paper);
journal.addStudyPlannerPage(doc, paper, { week: 1 });
journal.addPracticeTrackerPage(doc, paper);
```

- **`addHandwritingPracticePage`** draws sets of four evenly spaced lines, as in Indian school copybooks. Small letters fill the shaded band between lines 2 and 3 and sit on line 3, which is the darkest; line 2 is dashed; tall letters and capitals reach line 1 and tails reach line 4. A margin line runs down the left, with name and date lines at the top. Options: `bandMm`, the height of one set (default 12 mm on A4, between 8 and 16 mm on other papers, because children write at much the same size on any page); `rows`, to draw fewer sets than fit; `title` and `kicker` for the heading. The number of sets comes from the page height.
- **`addReadingLogPage`** is a table with Date, Book title, Pages or minutes and How did it go?, where each row has three star outlines to colour in. The stars are drawn from lines, since the standard PDF fonts have no emoji.
- **`addStudyPlannerPage`** has "This week's goal" and "Exams and tests coming up" boxes above a Monday to Sunday table with Subject, Homework or topic and a Done checkbox on each line. `opts.week` puts "Week n" above the title.
- **`addPracticeTrackerPage`** has 30 numbered day boxes in 5 rows of 6, each with a checkbox, and boxes for "Letters I find hard" and "Letters I improved".
- **`addNameCoverPage`** uses the existing cover frame with `title` (default: the journal title), `subtitle` and `kicker`, and a "This journal belongs to" line. Like `addCoverPage`, it draws on the current page.
- **`addHowToUsePage`** prints `opts.items` as a numbered list under `opts.title`. `opts.rulingGuide: true` adds an enlarged four-line set with a note beside each part.

### Footer Option

The constructor takes an optional third argument:

```javascript
const journal = new BulletJournal('My Handwriting Journal', 'color', {
    footer: 'Free handwriting check: vahinitech.com'
});
```

When `footer` is set, every page gets that text centred in small grey type in the bottom margin, on the same line as the page label and number; on covers it sits inside the frame. It never overlaps page content. If a long page label would run into it, the label is left out. Without the option nothing changes, and `new BulletJournal(title, colorScheme)` works as before.

### Owner Name

`owner` prints a name on the cover: on the "This journal belongs to" line of a name cover, and under the tagline of the bullet-journal cover. It is trimmed, inner spaces are collapsed, and it is cut at 40 characters (`MAX_OWNER_CHARS`); a long name is set smaller so it stays on the line.

```javascript
const journal = new BulletJournal('My Handwriting Journal', 'color', { owner: 'Vahini' });
```

The built-in PDF fonts only draw Latin-1 text, so a name in another script (Telugu, Hindi, Tamil...) is refused with an error rather than printed as stray symbols. `fitsStandardFonts(name)` tells a caller in advance. Without `owner`, the cover keeps its blank line to write on and nothing else changes.

## Printable Editions

`EDITIONS` lists ready-made books and `buildEdition(id, paperSize, options)` builds one and returns the jsPDF document. `options` takes `footer`, `colorScheme` (default `color`), `owner` and `art` (see [Pictures](#pictures)).

```javascript
import { EDITIONS, buildEdition } from 'bujo.js';

const doc = buildEdition('kids-handwriting-journal', 'A5', {
    footer: 'Free handwriting check: vahinitech.com'
});
const pdf = Buffer.from(doc.output('arraybuffer'));
```

| id | Title | Pages | Contents |
|----|-------|-------|----------|
| `kids-handwriting-journal` | My Handwriting Journal | 39 | Name cover, how to use, all about me, phone number to learn, my way home, practice tracker, 16 practice pages each followed by an activity (4 experiments, 3 idea pages, 2 trick pages, 4 drawing pages, colour mixing), 2 reading logs, a finishing page |
| `handwriting-practice-pages` | Handwriting Practice Pages | 11 | Name cover, 10 practice pages |
| `student-study-planner` | Student Study Planner | 17 | Name cover, 12 weekly planners, 2 habit trackers, 2 reading logs |
| `habit-tracker` | Habit Tracker | 13 | Cover, 12 undated monthly habit trackers |
| `bullet-journal` | Bullet Journal | 66 | The full book from `generate()` |
| `teacher-planner` | Teacher's Planner | 41 | Name cover, how to use, year at a glance, timetable, 14 lesson plans, 5 monthly attendance registers, 2 marks registers, 10 pages of notes on each child, 2 parent meeting logs, an end-of-term page, with section dividers |
| `advocate-case-diary` | Advocate's Case Diary | 64 | Name cover, how to use, 2 case index pages, year at a glance, 20 hearing diary pages, 30 case note pages, 3 client meeting logs, 4 dot grid pages, with section dividers |

Each entry has `id`, `title`, `description` (one sentence), `pages` (the exact count on every paper) and `papers` (`['A4', 'A5']`). The page counts are checked by the tests.

Editions are reproducible: they get a fixed creation date, a file id derived from the edition, paper, footer, colour scheme, owner name and whether pictures are drawn, and fixed document properties, so the same input always gives the same bytes.

The printed words of the editions live in `src/editionText.js`.

### Pictures

The published editions carry illustrations from [vahinitech/drawings](https://github.com/vahinitech/drawings), the library that holds every Vahini character. Pass them as `art`, a map from picture id to `{ data, width, height }` where `data` is the PNG's bytes:

```javascript
const doc = buildEdition('teacher-planner', 'A4', { art: { role_teacher: { data, width, height } } });
```

A page draws a picture only when its id is in `art`; otherwise it keeps the same writing space and leaves the picture out. `usedPictures(id)` lists the ids an edition asks for, and `COVER_PICTURES` the ones on each cover.

The pictures themselves are in `art/`, which is **not** in the npm package and **not** under the MIT licence: see [art/NOTICE.md](art/NOTICE.md). `art/art.json` pins the drawings commit and records where each picture came from; `scripts/export_art.py` (Python 3 with Pillow) writes them from a checkout of drawings at that commit, and `--check` confirms nothing changed.

### Build Script

```bash
npm run build:printables -- --footer "Free handwriting check: vahinitech.com"
# or
node scripts/build-printables.mjs [--footer "text"] [--out dir]
```

It writes every edition on A4 and A5 to `dist/printables/<id>-<paper>.pdf` (for example `kids-handwriting-journal-a5.pdf`) and one `manifest.json`:

```json
{
  "generator": "bujo.js",
  "version": "1.0.0",
  "commit": "<git HEAD sha, or null outside a git checkout>",
  "footer": "Free handwriting check: vahinitech.com",
  "files": [
    {
      "id": "kids-handwriting-journal",
      "title": "My Handwriting Journal",
      "description": "A month of daily handwriting practice for children, with experiments, ideas, clever tricks, pages to draw and paint, the way home and a family phone number to learn.",
      "paper": "A4",
      "pages": 39,
      "file": "kids-handwriting-journal-a4.pdf",
      "bytes": 2090475,
      "sha256": "<hex>"
    }
  ]
}
```

`footer` is `null` when `--footer` is not given. `--out` writes somewhere other than `dist/printables`. The script draws the pictures in `art/`, and stops if an edition names a picture that `art/` does not have, if a picture does not match its recorded digest, or if a built file does not have the page count its edition declares. It needs no network.

## Demo

Serve the repository with any static file server and open the generator UI:

```bash
npx serve .
# then open http://localhost:3000/public/
```

## Testing

```bash
npm test
npm run lint
```

The page and edition tests run against the real jsPDF: they check that every drawing and picture stays inside the content area from A6 to A3, that the footer is on every page and clear of everything else, the page count of every edition with and without pictures, that `art/` holds exactly the pictures the editions use with their recorded digests, and that two runs of the build script give byte-identical files.

## Dependencies

- [jsPDF](https://github.com/parallax/jsPDF) ^4 — the only runtime dependency.

## Versioning

This project follows [Semantic Versioning (SemVer)](https://semver.org/) via `semantic-release`. Version numbers are automatically updated based on conventional commits:

- `fix: <description>` – patch release.
- `feat: <description>` – minor release.
- `feat!: <description>` / `BREAKING CHANGE:` – major release.

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/YourFeature`).
3. Commit changes (`git commit -m 'feat: add new feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a Pull Request.
