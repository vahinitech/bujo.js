// Page methods and the footer option, drawn on the real jsPDF.

import { BulletJournal, PAPER_SIZES } from '../src/bujo.js';
import { EPS, FOOTER, newDoc, record } from './helpers/drawing.js';

const PAGE_METHODS = {
    addHandwritingPracticePage: (j, doc, paper) => j.addHandwritingPracticePage(doc, paper, { title: 'Letters a to m' }),
    addReadingLogPage: (j, doc, paper) => j.addReadingLogPage(doc, paper),
    addStudyPlannerPage: (j, doc, paper) => j.addStudyPlannerPage(doc, paper, { week: 7 }),
    addPracticeTrackerPage: (j, doc, paper) => j.addPracticeTrackerPage(doc, paper),
    addHowToUsePage: (j, doc, paper) =>
        j.addHowToUsePage(doc, paper, { items: ['Practise ten minutes a day.', 'Write slowly.'], rulingGuide: true })
};

describe('new page methods stay inside the content area', () => {
    ['A6', 'A5', 'A4', 'A3'].forEach((size) => {
        Object.entries(PAGE_METHODS).forEach(([name, draw]) => {
            test(`${name} on ${size}`, () => {
                const journal = new BulletJournal('Bounds', 'color', { footer: FOOTER });
                const doc = newDoc(journal, size);
                const shapes = record(doc);
                draw(journal, doc, PAPER_SIZES[size]);
                const L = journal._layout(PAPER_SIZES[size]);

                expect(doc.getNumberOfPages()).toBe(2);
                const onPage = shapes.filter((s) => s.page === 2);
                expect(onPage.length).toBeGreaterThan(10);
                onPage.forEach((s) => {
                    expect(s.x1).toBeGreaterThanOrEqual(L.margin - EPS);
                    expect(s.x2).toBeLessThanOrEqual(L.right + EPS);
                    if (s.kind === 'text' && s.y1 > L.bottom + EPS) {
                        // Only the footer line may sit below the content area.
                        expect(s.y1).toBeLessThan(L.h);
                        return;
                    }
                    expect(s.y1).toBeGreaterThanOrEqual(L.margin - EPS);
                    expect(s.y2).toBeLessThanOrEqual(L.bottom + EPS);
                });
            });
        });

        test(`addNameCoverPage on ${size} stays on the page and is centred`, () => {
            const journal = new BulletJournal('Cover', 'color', { footer: FOOTER });
            const doc = newDoc(journal, size);
            const shapes = record(doc);
            journal.addNameCoverPage(doc, PAPER_SIZES[size], {
                title: 'My Handwriting Journal',
                subtitle: 'Ten minutes a day'
            });
            const L = journal._layout(PAPER_SIZES[size]);
            expect(doc.getNumberOfPages()).toBe(1);
            shapes.forEach((s) => {
                expect(s.x1).toBeGreaterThanOrEqual(0);
                expect(s.x2).toBeLessThanOrEqual(L.w + EPS);
                expect(s.y1).toBeGreaterThanOrEqual(0);
                expect(s.y2).toBeLessThanOrEqual(L.h + EPS);
            });
            const texts = shapes.filter((s) => s.kind === 'text');
            expect(texts.map((t) => t.text)).toEqual(
                expect.arrayContaining(['My Handwriting Journal', 'This journal belongs to', FOOTER])
            );
            texts.forEach((t) => expect(Math.abs((t.x1 + t.x2) / 2 - L.centerX)).toBeLessThan(0.5));
        });
    });
});

describe('page contents', () => {
    test('handwriting practice page draws evenly spaced four-line sets', () => {
        const journal = new BulletJournal('Ruling');
        const doc = newDoc(journal, 'A4');
        const shapes = record(doc);
        journal.addHandwritingPracticePage(doc, PAPER_SIZES.A4);
        const L = journal._layout(PAPER_SIZES.A4);
        const rules = shapes
            .filter((s) => s.kind === 'line' && s.y1 === s.y2 && s.x1 === L.margin && Math.abs(s.x2 - L.right) < EPS)
            .map((s) => s.y1);
        expect(rules.length % 4).toBe(0);
        expect(rules.length / 4).toBeGreaterThanOrEqual(10);
        // Each set: top, bottom, line 2, line 3, 12 mm tall on A4, equal steps.
        for (let k = 0; k < rules.length; k += 4) {
            const [top, bottom, second, third] = rules.slice(k, k + 4);
            expect(bottom - top).toBeCloseTo(12, 5);
            expect(second - top).toBeCloseTo(4, 5);
            expect(third - second).toBeCloseTo(4, 5);
        }
        // Margin line down the left.
        expect(shapes.some((s) => s.kind === 'line' && s.x1 === s.x2 && s.x1 > L.margin)).toBe(true);
        const texts = shapes.filter((s) => s.kind === 'text').map((s) => s.text);
        expect(texts).toEqual(expect.arrayContaining(['name', 'date', 'Practice Page']));
    });

    test('band height can be set and is checked', () => {
        const journal = new BulletJournal('Ruling');
        const doc = newDoc(journal, 'A4');
        const shapes = record(doc);
        journal.addHandwritingPracticePage(doc, PAPER_SIZES.A4, { bandMm: 15, rows: 3 });
        const L = journal._layout(PAPER_SIZES.A4);
        const rules = shapes.filter(
            (s) => s.kind === 'line' && s.y1 === s.y2 && s.x1 === L.margin && Math.abs(s.x2 - L.right) < EPS
        );
        expect(rules).toHaveLength(12);
        expect(rules[1].y1 - rules[0].y1).toBeCloseTo(15, 5);
        expect(() => journal.addHandwritingPracticePage(doc, PAPER_SIZES.A4, { bandMm: 1 })).toThrow('Invalid band height');
        expect(() => journal.addHandwritingPracticePage(doc, PAPER_SIZES.A4, { bandMm: 'x' })).toThrow('Invalid band height');
    });

    test('default band is smaller on A6 and larger on A3, within 8 to 16 mm', () => {
        const journal = new BulletJournal();
        const a6 = journal._defaultBand(journal._layout(PAPER_SIZES.A6));
        const a3 = journal._defaultBand(journal._layout(PAPER_SIZES.A3));
        expect(a6).toBeGreaterThanOrEqual(8);
        expect(a6).toBeLessThan(12);
        expect(a3).toBeGreaterThan(12);
        expect(a3).toBeLessThanOrEqual(16);
    });

    test('reading log has the four columns and three stars per row', () => {
        const journal = new BulletJournal('Reading');
        const doc = newDoc(journal, 'A5');
        const shapes = record(doc);
        journal.addReadingLogPage(doc, PAPER_SIZES.A5);
        const texts = shapes.filter((s) => s.kind === 'text').map((s) => s.text);
        expect(texts).toEqual(expect.arrayContaining(['Date', 'Book title', 'Pages or minutes', 'How did it go?']));
        const L = journal._layout(PAPER_SIZES.A5);
        const rowLines = shapes.filter(
            (s) => s.kind === 'line' && s.y1 === s.y2 && s.x1 === L.margin && Math.abs(s.x2 - L.right) < EPS
        ).length;
        const rows = rowLines - 2; // table top and header bottom
        const starLines = shapes.filter((s) => s.kind === 'line' && s.x1 !== s.x2 && s.y1 !== s.y2).length;
        expect(starLines).toBe(rows * 3 * 10);
    });

    test('study planner lists the week with done boxes and both boxes', () => {
        const journal = new BulletJournal('Study');
        const doc = newDoc(journal, 'A4');
        const shapes = record(doc);
        journal.addStudyPlannerPage(doc, PAPER_SIZES.A4, { week: 3 });
        const texts = shapes.filter((s) => s.kind === 'text').map((s) => s.text);
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Subject',
            'Homework or topic', 'Done', "This week's goal", 'Exams and tests coming up', 'WEEK 3'].forEach((label) => {
            expect(texts).toContain(label);
        });
        const checkboxes = shapes.filter((s) => s.kind === 'rect' && Math.abs(s.x2 - s.x1 - (s.y2 - s.y1)) < EPS);
        expect(checkboxes.length).toBeGreaterThanOrEqual(7);
        expect(checkboxes.length % 7).toBe(0);
    });

    test('practice tracker has 30 numbered days with a checkbox each', () => {
        const journal = new BulletJournal('Tracker');
        const doc = newDoc(journal, 'A5');
        const shapes = record(doc);
        journal.addPracticeTrackerPage(doc, PAPER_SIZES.A5);
        const texts = shapes.filter((s) => s.kind === 'text').map((s) => s.text);
        for (let d = 1; d <= 30; d++) expect(texts).toContain(String(d));
        expect(texts).toEqual(expect.arrayContaining(['Letters I find hard', 'Letters I improved']));
        expect(shapes.filter((s) => s.kind === 'rect')).toHaveLength(30);
    });

    test('habit tracker can carry a month line and its own kicker', () => {
        const journal = new BulletJournal('Habits');
        const doc = newDoc(journal, 'A4');
        const shapes = record(doc);
        journal.addFlexibleTrackingPage(doc, PAPER_SIZES.A4, { kicker: 'Month 2 of 12', monthLine: true });
        const texts = shapes.filter((s) => s.kind === 'text').map((s) => s.text);
        expect(texts).toEqual(expect.arrayContaining(['MONTH 2 OF 12', 'month of', 'Habit Tracker']));
    });

    test('page methods reject a missing document', () => {
        const journal = new BulletJournal();
        ['addHandwritingPracticePage', 'addReadingLogPage', 'addStudyPlannerPage', 'addPracticeTrackerPage',
            'addNameCoverPage', 'addHowToUsePage'].forEach((name) => {
            expect(() => journal[name](null, PAPER_SIZES.A4)).toThrow('Invalid document instance');
        });
    });
});
describe('footer option', () => {
    test('the two-argument constructor still works and has no footer', () => {
        const journal = new BulletJournal('Two Args', 'monochrome');
        expect(journal.title).toBe('Two Args');
        expect(journal.colorScheme).toBe('monochrome');
        expect(journal.footerText).toBeNull();
    });

    test('blank footers are ignored and long ones are capped', () => {
        expect(new BulletJournal('x', 'color', { footer: '   ' }).footerText).toBeNull();
        expect(new BulletJournal('x', 'color', { footer: 42 }).footerText).toBeNull();
        expect(new BulletJournal('x', 'color', { footer: 'a'.repeat(500) }).footerText).toHaveLength(120);
    });

    test('no footer is drawn when the option is not set', () => {
        const journal = new BulletJournal('Plain');
        const doc = newDoc(journal, 'A4');
        const shapes = record(doc);
        journal.addNameCoverPage(doc, PAPER_SIZES.A4);
        journal.addHandwritingPracticePage(doc, PAPER_SIZES.A4);
        journal.addReadingLogPage(doc, PAPER_SIZES.A4);
        expect(shapes.some((s) => s.text === FOOTER)).toBe(false);
        expect(shapes.some((s) => s.text && s.text.includes('vahinitech'))).toBe(false);
    });

    test('a page label that would run into the footer gives way to it', () => {
        const journal = new BulletJournal('A very long journal title that fills the whole bottom line', 'color', {
            footer: FOOTER
        });
        const doc = newDoc(journal, 'A6');
        const shapes = record(doc);
        journal.addDottedGridPage(doc, 5, PAPER_SIZES.A6);
        const texts = shapes.filter((s) => s.kind === 'text').map((s) => s.text);
        expect(texts).toContain(FOOTER);
        expect(texts.some((t) => t.startsWith('A VERY LONG'))).toBe(false);
    });
});

describe('spaced kickers', () => {
    test('a centred kicker is centred including its letter spacing', () => {
        const journal = new BulletJournal('Kicker');
        const doc = newDoc(journal, 'A5');
        const shapes = record(doc);
        journal.addCoverPage(doc, PAPER_SIZES.A5);
        const L = journal._layout(PAPER_SIZES.A5);
        const kicker = shapes.find((s) => s.kind === 'text' && s.text === 'BULLET JOURNAL');
        expect(kicker.x2 - kicker.x1).toBeGreaterThan(doc.getTextWidth('BULLET JOURNAL'));
        expect(Math.abs((kicker.x1 + kicker.x2) / 2 - L.centerX)).toBeLessThan(0.05);
    });
});
