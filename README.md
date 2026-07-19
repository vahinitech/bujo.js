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
| `addFlexibleTrackingPage(doc, paper)` | Habit tracker + goals |

## Demo

Serve the repository with any static file server and open the generator UI:

```bash
npx serve .
# then open http://localhost:3000/public/
```

## Testing

```bash
npm test
```

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
