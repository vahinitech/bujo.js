import { BulletJournal, buildEdition } from '../src/bujo.js';

describe('generation input boundaries', () => {
    test.each(['constructor', 'toString', '__proto__'])('rejects inherited paper name %s', (paper) => {
        const journal = new BulletJournal();
        expect(() => journal.createDocument(paper)).toThrow('Unsupported paper size');
        expect(() => journal.generate(paper)).toThrow('Unsupported paper size');
        expect(() => buildEdition('habit-tracker', paper)).toThrow('Unsupported paper size');
    });

    test.each([Infinity, NaN, '5', 0, -1, 0.000001])('rejects unsafe spacing %s before changing the document', (spacing) => {
        const journal = new BulletJournal();
        const doc = journal.createDocument('A4');
        // Stop immediately if the old code enters its unbounded drawing loop.
        const draw = jest.spyOn(doc, 'circle').mockImplementation(() => { throw new Error('Drawing started'); });
        expect(() => journal.addDottedGridPage(doc, spacing)).toThrow('Invalid dot spacing');
        expect(doc.getNumberOfPages()).toBe(1);
        expect(draw).not.toHaveBeenCalled();
    });

    test.each([{ width: Infinity, height: 297 }, { width: 210, height: NaN }, { width: -1, height: 297 }])('rejects invalid grid dimensions', (paper) => {
        const journal = new BulletJournal();
        const doc = journal.createDocument('A4');
        jest.spyOn(doc, 'circle').mockImplementation(() => { throw new Error('Drawing started'); });
        expect(() => journal.addDottedGridPage(doc, 5, paper)).toThrow('Invalid paper dimensions');
        expect(doc.getNumberOfPages()).toBe(1);
    });

    test.each([5, 0.2])('keeps metric and legacy inch grids working: %s', (spacing) => {
        const journal = new BulletJournal();
        const doc = journal.createDocument('A4');
        journal.addDottedGridPage(doc, spacing);
        expect(doc.getNumberOfPages()).toBe(2);
    });

    test.each(['../outside', '..\\outside', 'C:\\outside', '/tmp/outside'])('keeps title %s inside a filename', (title) => {
        const journal = new BulletJournal(title);
        const doc = journal.createDocument('A4');
        jest.spyOn(journal, 'generate').mockReturnValue(doc);
        const save = jest.spyOn(doc, 'save').mockImplementation(() => {});
        journal.createBulletJournalBook('A4');
        expect(save).toHaveBeenCalledTimes(1);
        expect(save.mock.calls[0][0]).not.toMatch(/[\\/:]/);
        expect(save.mock.calls[0][0]).toMatch(/_journal_book\.pdf$/);
    });
});
