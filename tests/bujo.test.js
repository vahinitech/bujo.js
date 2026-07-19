import { BulletJournal, PAPER_SIZES } from '../src/bujo';
import { jsPDF } from 'jspdf';
import { applyColorScheme } from '../src/utils/colorScheme';

// Mock jsPDF so no real PDF is rendered during tests.
jest.mock('jspdf', () => {
    const makeDoc = () => ({
        addPage: jest.fn(),
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        setCharSpace: jest.fn(),
        text: jest.fn(),
        circle: jest.fn(),
        line: jest.fn(),
        rect: jest.fn(),
        roundedRect: jest.fn(),
        addImage: jest.fn(),
        internal: { pageSize: { width: 210, height: 297 } },
        save: jest.fn(),
        setTextColor: jest.fn(),
        setDrawColor: jest.fn(),
        setFillColor: jest.fn(),
        setLineWidth: jest.fn()
    });
    return { jsPDF: jest.fn().mockImplementation(makeDoc) };
});

const A4 = { width: 210, height: 297 };

describe('BulletJournal PDF generation', () => {
    let journal;
    let doc;

    beforeEach(() => {
        jest.clearAllMocks();
        journal = new BulletJournal('Test Journal', 'monochrome');
        doc = new jsPDF();
    });

    // Constructor defaults
    test('should set default values if no title or color scheme is provided', () => {
        const defaultJournal = new BulletJournal();
        expect(defaultJournal.title).toBe('My Bullet Journal');
        expect(defaultJournal.colorScheme).toBe('color');
    });

    test('should apply colors using applyColorScheme with monochrome', () => {
        journal.applyColors(doc);
        const expected = applyColorScheme(doc, 'monochrome');
        expect(doc.setTextColor).toHaveBeenCalledWith(expected.textColor);
        expect(doc.setDrawColor).toHaveBeenCalledWith(expected.lineColor);
        expect(journal.colors.ink).toBe(expected.ink);
    });

    // Paper size handling
    test('exposes metric paper sizes', () => {
        expect(PAPER_SIZES.A4).toEqual({ width: 210, height: 297 });
        expect(PAPER_SIZES.A6).toEqual({ width: 105, height: 148 });
    });

    test('should throw error for unsupported paper size in createBulletJournalBook', () => {
        expect(() => journal.createBulletJournalBook('InvalidSize', doc)).toThrow('Unsupported paper size');
        expect(() => journal.generate('Letter', doc)).toThrow('Unsupported paper size');
    });

    // Legacy inch dimensions keep working
    test('accepts legacy inch-based paper dimensions', () => {
        expect(() => journal.addDailyPlanningPage(doc, { width: 8.27, height: 11.69 })).not.toThrow();
        expect(() => journal.addWeeklyOverviewPage(doc, { width: 8.27, height: 11.69 })).not.toThrow();
        expect(() => journal.addFlexibleTrackingPage(doc, { width: 8.27, height: 11.69 })).not.toThrow();
    });

    // Cover page
    test('cover page draws on the current page without adding a new one', () => {
        journal.addCoverPage(doc, A4);
        expect(doc.addPage).not.toHaveBeenCalled();
        expect(doc.text).toHaveBeenCalledWith(
            'Test Journal',
            expect.any(Number),
            expect.any(Number),
            expect.objectContaining({ align: 'center' })
        );
    });

    // Index page
    test('index page lists every generated section with its page number', () => {
        journal.addIndexPage(doc, A4);
        expect(doc.addPage).toHaveBeenCalledTimes(1);
        expect(doc.text).toHaveBeenCalledWith('Future Log', expect.any(Number), expect.any(Number));
        expect(doc.text).toHaveBeenCalledWith('Month 12', expect.any(Number), expect.any(Number));
    });

    // Dotted grid
    test('should throw an error if doc is missing in addDottedGridPage', () => {
        expect(() => journal.addDottedGridPage(null, 5, A4)).toThrow('Invalid document instance');
    });

    test('should throw an error for invalid dotSpacing in addDottedGridPage', () => {
        expect(() => journal.addDottedGridPage(doc, -1, A4)).toThrow('Invalid dot spacing');
        expect(() => journal.addDottedGridPage(doc, 0, A4)).toThrow('Invalid dot spacing');
    });

    test('should throw an error if paperDimensions is null in addDottedGridPage', () => {
        expect(() => journal.addDottedGridPage(doc, 5, null)).toThrow('Invalid paper dimensions');
    });

    test('dot grid covers the full content area', () => {
        journal.addDottedGridPage(doc, 5, A4);
        // A4 content area is roughly 184 × 271 mm → a 5 mm grid needs
        // 37 × ~53 dots; assert we drew a full-page field, not a corner.
        expect(doc.circle.mock.calls.length).toBeGreaterThan(1500);
    });

    test('legacy inch dot spacing is converted to millimetres', () => {
        journal.addDottedGridPage(doc, 0.2, A4); // 0.2 in → 5.08 mm
        expect(doc.circle.mock.calls.length).toBeGreaterThan(1400);
    });

    // Daily plan
    test('daily plan renders time blocks, priorities and to-dos', () => {
        journal.addDailyPlanningPage(doc, A4);
        const drawn = doc.text.mock.calls.map((c) => String(c[0]).toUpperCase());
        ['MORNING', 'AFTERNOON', 'EVENING', 'TOP PRIORITIES', 'TO-DO', 'NOTES'].forEach((label) => {
            expect(drawn).toContain(label);
        });
        expect(doc.rect).toHaveBeenCalled(); // checkboxes
    });

    test('should throw error if paperDimensions is missing in addDailyPlanningPage', () => {
        journal._paper = null;
        expect(() => journal.addDailyPlanningPage(doc, null)).toThrow('Invalid paper dimensions');
    });

    // Weekly overview
    test('weekly overview renders all seven days plus goals panel', () => {
        journal.addWeeklyOverviewPage(doc, A4);
        const drawn = doc.text.mock.calls.map((c) => c[0]);
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Goals & Habits'].forEach(
            (day) => expect(drawn).toContain(day)
        );
    });

    test('should throw error if paperDimensions is missing in addWeeklyOverviewPage', () => {
        expect(() => journal.addWeeklyOverviewPage(doc, null)).toThrow('Invalid paper dimensions');
    });

    // Habit tracker
    test('habit tracker renders a 31-day matrix and goal checkboxes', () => {
        journal.addFlexibleTrackingPage(doc, A4);
        const drawn = doc.text.mock.calls.map((c) => String(c[0]));
        expect(drawn).toContain('1');
        expect(drawn).toContain('31');
        expect(drawn.map((t) => t.toUpperCase())).toContain('GOAL-SETTING');
        expect(doc.rect).toHaveBeenCalled();
    });

    test('should throw error if paperDimensions is missing in addFlexibleTrackingPage', () => {
        expect(() => journal.addFlexibleTrackingPage(doc, null)).toThrow('Invalid paper dimensions');
    });

    // Illustration page
    test('should throw an error if doc is missing in addIllustrationPage', () => {
        expect(() => journal.addIllustrationPage(null, 'dailyPlanner')).toThrow('Invalid document instance');
    });

    test('should add illustration page without errors', () => {
        expect(() => journal.addIllustrationPage(doc, 'flexibleTracking')).not.toThrow();
        expect(doc.addImage).toHaveBeenCalledWith(
            expect.stringContaining('flexibleTracking.png'),
            'PNG',
            expect.any(Number),
            expect.any(Number),
            expect.any(Number),
            expect.any(Number)
        );
    });

    // Small paper sizes must not overflow
    ['A3', 'A4', 'A5', 'A6'].forEach((size) => {
        test(`generates a complete ${size} journal without errors`, () => {
            expect(() => journal.generate(size, doc)).not.toThrow();
        });
    });

    // Full book assembly
    test('should call each page method in createBulletJournalBook', () => {
        jest.spyOn(journal, 'applyColors');
        jest.spyOn(journal, 'addCoverPage');
        jest.spyOn(journal, 'addIndexPage');
        jest.spyOn(journal, 'addDottedGridPage');
        jest.spyOn(journal, 'addDailyPlanningPage');
        jest.spyOn(journal, 'addWeeklyOverviewPage');
        jest.spyOn(journal, 'addFlexibleTrackingPage');

        journal.createBulletJournalBook('A4', doc);

        expect(journal.applyColors).toHaveBeenCalledTimes(1);
        expect(journal.addCoverPage).toHaveBeenCalledTimes(1);
        expect(journal.addIndexPage).toHaveBeenCalledTimes(1);
        expect(journal.addDottedGridPage).toHaveBeenCalledTimes(12);
        expect(journal.addDailyPlanningPage).toHaveBeenCalledTimes(12);
        expect(journal.addWeeklyOverviewPage).toHaveBeenCalledTimes(12);
        expect(journal.addFlexibleTrackingPage).toHaveBeenCalledTimes(12);
    });

    test('book has the expected page count with no blank first page', () => {
        journal.createBulletJournalBook('A4', doc);
        // Cover uses the document's initial page, so addPage is called
        // exactly (expected pages - 1) times.
        expect(doc.addPage).toHaveBeenCalledTimes(journal.getExpectedPageCount() - 1);
    });

    test('should return the correct expected page count', () => {
        // 1 cover + 1 index + 13 future log + 2 milestones + 1 year overview + 48 monthly
        expect(journal.getExpectedPageCount()).toBe(66);
    });

    test('should call save with the correct filename in createBulletJournalBook', () => {
        journal.createBulletJournalBook('A4', doc);
        expect(doc.save).toHaveBeenCalledWith('test_journal_journal_book.pdf');
    });

    test('generate returns the document without saving', () => {
        const result = journal.generate('A4', doc);
        expect(result).toBe(doc);
        expect(doc.save).not.toHaveBeenCalled();
    });
});
