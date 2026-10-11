import { BulletJournal, PAPER_SIZES } from './bujo.js';

/**
 * Ready-made printable editions. Each entry is plain data so it can be
 * written straight into a manifest; the page order lives in COMPOSERS.
 *
 * `pages` is the exact page count of the built PDF on every paper size,
 * and tests/editions.test.js checks it against real documents.
 */
const EDITION_PAPERS = Object.freeze(['A4', 'A5']);

const HOW_TO_USE = [
    'Practise for about ten minutes a day. A short session every day does more than a long one once a week.',
    'Sit up straight with both feet flat on the floor, and tilt the page a little.',
    'Hold the pencil lightly, a little way up from the point. A tight grip makes the hand tired.',
    'Write slowly. Small letters fill the shaded band and sit on the third line. Tall letters reach the top line, and tails go down to the bottom line.',
    'Start each practice page with a few letters you find easy, then move on to the ones you find hard.',
    'After each practice, tick a box on the practice tracker.',
    'Once a week, look back at your first pages, and write the letters that got better in "Letters I improved".'
];

const EDITIONS = Object.freeze([
    {
        id: 'kids-handwriting-journal',
        title: 'My Handwriting Journal',
        description: 'A month of daily handwriting practice for children, with a practice tracker and a reading log.',
        pages: 29,
        papers: EDITION_PAPERS
    },
    {
        id: 'handwriting-practice-pages',
        title: 'Handwriting Practice Pages',
        description: 'Ten pages of four-line handwriting ruling, as used in school copybooks.',
        pages: 11,
        papers: EDITION_PAPERS
    },
    {
        id: 'student-study-planner',
        title: 'Student Study Planner',
        description: 'A twelve-week term planner for homework and tests, with habit trackers and a reading log.',
        pages: 17,
        papers: EDITION_PAPERS
    },
    {
        id: 'habit-tracker',
        title: 'Habit Tracker',
        description: 'Twelve undated monthly habit trackers with space for goals.',
        pages: 13,
        papers: EDITION_PAPERS
    },
    {
        id: 'bullet-journal',
        title: 'Bullet Journal',
        description: 'The full undated bullet journal: future log, milestones, and daily, weekly and monthly pages.',
        pages: 66,
        papers: EDITION_PAPERS
    }
].map((edition) => Object.freeze(edition)));

function repeat(times, fn) {
    for (let n = 1; n <= times; n++) fn(n);
}

const COMPOSERS = {
    'kids-handwriting-journal': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'Practice Every Day',
            subtitle: 'Ten minutes a day of careful writing'
        });
        j.addHowToUsePage(doc, paper, { items: HOW_TO_USE, rulingGuide: true });
        j.addPracticeTrackerPage(doc, paper);
        repeat(24, (n) => j.addHandwritingPracticePage(doc, paper, { kicker: `Page ${n} of 24` }));
        repeat(2, () => j.addReadingLogPage(doc, paper));
    },
    'handwriting-practice-pages': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'Four-Line Ruling',
            subtitle: 'Small letters in the shaded band, tall letters to the top line'
        });
        repeat(10, (n) => j.addHandwritingPracticePage(doc, paper, { kicker: `Page ${n} of 10` }));
    },
    'student-study-planner': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'One Term, Week by Week',
            subtitle: 'Homework, tests and good habits in one place'
        });
        repeat(12, (n) => j.addStudyPlannerPage(doc, paper, { week: n }));
        repeat(2, () => j.addFlexibleTrackingPage(doc, paper));
        repeat(2, () => j.addReadingLogPage(doc, paper));
    },
    'habit-tracker': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'Twelve Months',
            subtitle: 'Small steps, every day'
        });
        repeat(12, (n) => j.addFlexibleTrackingPage(doc, paper, { kicker: `Month ${n} of 12`, monthLine: true }));
    }
};

/** Fixed metadata so the same edition always produces the same bytes. */
const FIXED_CREATION_DATE = "D:20240101000000+00'00'";

/** 128-bit hex id from a string: four 32-bit FNV-1a passes with different seeds. */
function stableFileId(text) {
    let out = '';
    for (let seed = 0; seed < 4; seed++) {
        let hash = (0x811c9dc5 ^ (seed * 0x9e3779b1)) >>> 0;
        const input = `${seed}:${text}`;
        for (let k = 0; k < input.length; k++) {
            hash ^= input.charCodeAt(k);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        out += hash.toString(16).padStart(8, '0');
    }
    return out.toUpperCase();
}

/**
 * Builds one edition and returns the jsPDF document (nothing is saved).
 * options: { footer, colorScheme }.
 */
function buildEdition(id, paperSize, options = {}) {
    const edition = EDITIONS.find((e) => e.id === id);
    if (!edition) throw new Error(`Unknown edition: ${id}`);
    const paper = PAPER_SIZES[paperSize];
    if (!paper) throw new Error('Unsupported paper size');

    const journal = new BulletJournal(edition.title, options.colorScheme || 'color', { footer: options.footer });
    let doc;
    if (id === 'bullet-journal') {
        doc = journal.generate(paperSize);
    } else {
        doc = journal.createDocument(paperSize);
        journal._paper = paper;
        journal._pageNo = 1;
        journal.applyColors(doc);
        COMPOSERS[id](journal, doc, paper);
    }

    if (typeof doc.setCreationDate === 'function') doc.setCreationDate(FIXED_CREATION_DATE);
    if (typeof doc.setFileId === 'function') {
        doc.setFileId(stableFileId(`${id}|${paperSize}|${journal.footerText || ''}|${journal.colorScheme}`));
    }
    if (typeof doc.setProperties === 'function') {
        doc.setProperties({
            title: edition.title,
            subject: edition.description,
            creator: 'bujo.js',
            keywords: 'printable, journal, planner'
        });
    }
    return doc;
}

export { EDITIONS, EDITION_PAPERS, buildEdition };
