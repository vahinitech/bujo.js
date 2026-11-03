import { BulletJournal, PAPER_SIZES } from './bujo.js';
import {
    ADVOCATE_HOW_TO_USE,
    DRAWING_PROMPTS,
    EXPERIMENTS,
    IDEA_CHALLENGES,
    IF_I_AM_LOST,
    KIDS_HOW_TO_USE,
    TEACHER_HOW_TO_USE,
    TRICKS
} from './editionText.js';

/**
 * Ready-made printable editions. Each entry is plain data so it can be
 * written straight into a manifest; the page order lives in COMPOSERS.
 *
 * `pages` is the exact page count of the built PDF on every paper size,
 * and tests/editions.test.js checks it against real documents.
 */
const EDITION_PAPERS = Object.freeze(['A4', 'A5']);

const EDITIONS = Object.freeze([
    {
        id: 'kids-handwriting-journal',
        title: 'My Handwriting Journal',
        description: 'A month of daily handwriting practice for children, with experiments, ideas, clever tricks, pages to draw and paint, the way home and a family phone number to learn.',
        pages: 39,
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
    },
    {
        id: 'teacher-planner',
        title: 'Teacher\'s Planner',
        description: 'One school term for a class teacher: timetable, weekly lesson plans, attendance and marks registers, notes on each child and parent meetings.',
        pages: 41,
        papers: EDITION_PAPERS
    },
    {
        id: 'advocate-case-diary',
        title: 'Advocate\'s Case Diary',
        description: 'A case diary for lawyers: case index, hearings with next dates, one case note page per matter and client meetings.',
        pages: 64,
        papers: EDITION_PAPERS
    }
].map((edition) => Object.freeze(edition)));

/** Pictures on each edition's cover, by id in the `art` option. */
const COVER_PICTURES = Object.freeze({
    'kids-handwriting-journal': ['role_student', 'mascot_practice'],
    'handwriting-practice-pages': ['feature_handwriting'],
    'student-study-planner': ['feature_week'],
    'habit-tracker': ['tara_pause'],
    'bullet-journal': ['feature_write'],
    'teacher-planner': ['role_teacher'],
    'advocate-case-diary': ['courtroom_note']
});

function repeat(times, fn) {
    for (let n = 1; n <= times; n++) fn(n);
}

/** The children's activities, in the order they come between practice pages. */
function kidsActivities(j, doc, paper) {
    const experiment = (key, picture) => () => j.addExperimentPage(doc, paper, { ...EXPERIMENTS[key], picture });
    const ideas = (n) => () => j.addIdeasPage(doc, paper, { challenge: IDEA_CHALLENGES[n], picture: 'feature_mindmap' });
    const tricks = (n) => () => j.addTricksPage(doc, paper, { tricks: TRICKS[n], picture: 'mascot_curious' });
    const drawing = (key, picture) => () => j.addDrawingPage(doc, paper, { prompt: DRAWING_PROMPTS[key], picture });
    return [
        experiment('float', 'chinnu_try'),
        drawing('window'),
        ideas(0),
        tricks(0),
        experiment('shadow', 'chinnu_try'),
        () => j.addColourMixPage(doc, paper, { picture: 'cover_art' }),
        ideas(1),
        drawing('bheema', 'mascot_welcome'),
        experiment('seeds', 'sprout'),
        tricks(1),
        ideas(2),
        drawing('machine'),
        experiment('rainbow', 'chinnu_try'),
        drawing('family')
    ];
}

const KIDS_PRACTICE_PAGES = 16;

const COMPOSERS = {
    'kids-handwriting-journal': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'Practice Every Day',
            subtitle: 'Ten minutes a day of careful writing',
            pictures: COVER_PICTURES['kids-handwriting-journal']
        });
        j.addHowToUsePage(doc, paper, { items: KIDS_HOW_TO_USE, rulingGuide: true });
        j.addAboutMePage(doc, paper, { lostTips: IF_I_AM_LOST, picture: 'mascot_welcome' });
        j.addNumberMemoryPage(doc, paper, { picture: 'pihu_notice' });
        j.addWayHomePage(doc, paper, { picture: 'rama_explore' });
        j.addPracticeTrackerPage(doc, paper);
        // A practice page, then an activity, so every day has some of both.
        const activities = kidsActivities(j, doc, paper);
        repeat(KIDS_PRACTICE_PAGES, (n) => {
            j.addHandwritingPracticePage(doc, paper, { kicker: `Page ${n} of ${KIDS_PRACTICE_PAGES}` });
            if (activities[n - 1]) activities[n - 1]();
        });
        repeat(2, () => j.addReadingLogPage(doc, paper));
        j.addFinishPage(doc, paper, { picture: 'mascot_success' });
    },
    'handwriting-practice-pages': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'Four-Line Ruling',
            subtitle: 'Small letters in the shaded band, tall letters to the top line',
            pictures: COVER_PICTURES['handwriting-practice-pages']
        });
        repeat(10, (n) => j.addHandwritingPracticePage(doc, paper, { kicker: `Page ${n} of 10` }));
    },
    'student-study-planner': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'One Term, Week by Week',
            subtitle: 'Homework, tests and good habits in one place',
            pictures: COVER_PICTURES['student-study-planner']
        });
        repeat(12, (n) => j.addStudyPlannerPage(doc, paper, { week: n }));
        repeat(2, () => j.addFlexibleTrackingPage(doc, paper));
        repeat(2, () => j.addReadingLogPage(doc, paper));
    },
    'habit-tracker': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'Twelve Months',
            subtitle: 'Small steps, every day',
            pictures: COVER_PICTURES['habit-tracker']
        });
        repeat(12, (n) => j.addFlexibleTrackingPage(doc, paper, { kicker: `Month ${n} of 12`, monthLine: true }));
    },
    'teacher-planner': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'One School Term',
            subtitle: 'Plans, registers and notes on every child',
            pictures: COVER_PICTURES['teacher-planner']
        });
        j.addHowToUsePage(doc, paper, { items: TEACHER_HOW_TO_USE });
        j.addHelicopterOverviewPage(doc, paper);
        j.addTimetablePage(doc, paper);
        j.addSectionPage(doc, paper, {
            kicker: 'Week by Week',
            title: 'Lesson Plans',
            text: 'Plan the week before it starts, and tick each lesson when it is done.',
            picture: 'classroom_teacher_hint'
        });
        repeat(14, (n) => j.addLessonPlanPage(doc, paper, { week: n }));
        repeat(5, (n) => j.addRegisterPage(doc, paper, {
            kicker: `Month ${n} of 5`,
            title: 'Attendance',
            columns: 31,
            numbered: true,
            fillIn: 'month of'
        }));
        j.addSectionPage(doc, paper, {
            kicker: 'Tests and Activities',
            title: 'Marks',
            text: 'Write each test at the top of a column and its maximum marks below it.',
            picture: 'assessment_mark_paper'
        });
        repeat(2, (n) => j.addRegisterPage(doc, paper, {
            kicker: `Marks ${n} of 2`,
            title: 'Marks Register',
            columns: 10,
            subHead: 'max marks',
            total: true,
            fillIn: 'subject'
        }));
        j.addSectionPage(doc, paper, {
            kicker: 'Every Child',
            title: 'Notes on Each Child',
            text: 'A few lines often: what each child does well, where they need help and the next step.',
            picture: 'assessment_plan_support'
        });
        repeat(10, () => j.addStudentNotesPage(doc, paper));
        repeat(2, () => j.addTablePage(doc, paper, {
            kicker: 'Families',
            title: 'Parent Meetings',
            columns: [
                { label: 'Date', share: 0.12 },
                { label: 'Child', share: 0.2 },
                { label: 'Who came', share: 0.16 },
                { label: 'What we discussed', share: 0.34 },
                { label: 'Next step', share: 0.18 }
            ],
            rowMm: 14
        }));
        j.addNotesPage(doc, paper, {
            kicker: 'End of Term',
            title: 'Looking Back',
            prompts: ['What worked well this term', 'What I will change next term', 'Children to watch closely next term']
        });
    },
    'advocate-case-diary': (j, doc, paper) => {
        j.addNameCoverPage(doc, paper, {
            kicker: 'Hearings, Notes and Next Dates',
            subtitle: 'Every matter, every date, on paper',
            pictures: COVER_PICTURES['advocate-case-diary']
        });
        j.addHowToUsePage(doc, paper, { items: ADVOCATE_HOW_TO_USE });
        repeat(2, (n) => j.addTablePage(doc, paper, {
            kicker: `Index ${n} of 2`,
            title: 'Case Index',
            columns: [
                { label: 'No.', share: 0.07 },
                { label: 'Case number', share: 0.2 },
                { label: 'Court', share: 0.2 },
                { label: 'Parties', share: 0.38 },
                { label: 'Diary pages', share: 0.15 }
            ],
            rowMm: 9
        }));
        j.addHelicopterOverviewPage(doc, paper);
        j.addSectionPage(doc, paper, {
            kicker: 'Day by Day',
            title: 'Hearings',
            text: 'Each day\'s matters, the stage reached and the next date.',
            picture: 'courtroom_find_note'
        });
        repeat(20, () => j.addTablePage(doc, paper, {
            kicker: 'Hearings',
            title: 'Hearing Diary',
            columns: [
                { label: 'Date', share: 0.11 },
                { label: 'Court and hall', share: 0.15 },
                { label: 'Case number', share: 0.17 },
                { label: 'Parties', share: 0.25 },
                { label: 'Stage today', share: 0.16 },
                { label: 'Next date', share: 0.16 }
            ],
            rowMm: 12
        }));
        j.addSectionPage(doc, paper, {
            kicker: 'One Page per Matter',
            title: 'Case Notes',
            text: 'The facts, the points to argue, the pages to cite and what to do before the next date.',
            picture: 'courtroom_review_note'
        });
        repeat(30, () => j.addCaseNotePage(doc, paper));
        repeat(3, () => j.addTablePage(doc, paper, {
            kicker: 'Clients',
            title: 'Client Meetings',
            columns: [
                { label: 'Date', share: 0.12 },
                { label: 'Client', share: 0.2 },
                { label: 'Case number', share: 0.18 },
                { label: 'What we discussed', share: 0.33 },
                { label: 'Follow-up', share: 0.17 }
            ],
            rowMm: 14
        }));
        repeat(4, () => j.addDottedGridPage(doc, 5, paper));
    }
};

/**
 * Every picture id an edition draws, found by building it once with a
 * stand-in that records the ids it is asked for. The build script and the
 * tests use it to check that art/ has what each edition needs.
 */
function usedPictures(id) {
    const edition = EDITIONS.find((e) => e.id === id);
    if (!edition) throw new Error(`Unknown edition: ${id}`);
    const seen = new Set();
    const journal = new BulletJournal(edition.title, 'color');
    journal._hasPicture = (picture) => {
        if (picture) seen.add(picture);
        return false;
    };
    if (id === 'bullet-journal') {
        journal.generate('A4', null, { coverPictures: COVER_PICTURES[id] });
    } else {
        const doc = journal.createDocument('A4');
        journal._paper = PAPER_SIZES.A4;
        journal._pageNo = 1;
        journal.applyColors(doc);
        COMPOSERS[id](journal, doc, PAPER_SIZES.A4);
    }
    return [...seen].sort();
}

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
 * options: { footer, colorScheme, owner, art, sourceRevision }. `owner` prints a name on
 * the cover. `art` gives the pictures by id (see BulletJournal); the
 * published editions are built with the pictures in art/, and without
 * them every page keeps its writing space and leaves the picture out.
 */
function buildEdition(id, paperSize, options = {}) {
    const edition = EDITIONS.find((e) => e.id === id);
    if (!edition) throw new Error(`Unknown edition: ${id}`);
    const paper = PAPER_SIZES[paperSize];
    if (!Object.hasOwn(PAPER_SIZES, paperSize)) throw new Error('Unsupported paper size');

    const sourceRevision = options.sourceRevision ?? null;
    if (sourceRevision !== null && (typeof sourceRevision !== 'string' || !/^[0-9a-f]{40}$/.test(sourceRevision))) {
        throw new Error('sourceRevision must be a lowercase 40-character Git commit SHA');
    }

    const journal = new BulletJournal(edition.title, options.colorScheme || 'color', {
        footer: options.footer,
        owner: options.owner,
        art: options.art
    });
    let doc;
    if (id === 'bullet-journal') {
        doc = journal.generate(paperSize, null, { coverPictures: COVER_PICTURES[id] });
    } else {
        doc = journal.createDocument(paperSize);
        journal._paper = paper;
        journal._pageNo = 1;
        journal.applyColors(doc);
        COMPOSERS[id](journal, doc, paper);
    }

    if (typeof doc.setCreationDate === 'function') doc.setCreationDate(FIXED_CREATION_DATE);
    if (typeof doc.setFileId === 'function') {
        // Include artwork presence and the known revision in the edition ID.
        const owner = journal.owner ? `|${journal.owner}` : '';
        const art = Object.keys(journal.art).length ? '|art' : '';
        const revision = sourceRevision ? `|${sourceRevision}` : '';
        doc.setFileId(stableFileId(`${id}|${paperSize}|${journal.footerText || ''}|${journal.colorScheme}${owner}${art}${revision}`));
    }
    journal._setMetadata(doc, paperSize, { edition: id, description: edition.description, sourceRevision });
    return doc;
}

export { EDITIONS, EDITION_PAPERS, COVER_PICTURES, buildEdition, usedPictures };
