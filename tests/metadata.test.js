import { BulletJournal, EDITIONS, buildEdition } from '../src/bujo.js';
import { jsPDF } from 'jspdf';

function checkMetadata(doc, title, paper, edition = 'custom', revision = 'unknown') {
    const pdf = doc.output();
    expect(pdf).toContain('/Author (Vahini Technologies)');
    expect(pdf).toContain('/Creator (Vahini Technologies | bujo.js)');
    expect(pdf).toContain(`/Title (${title})`);
    expect(pdf).toContain('https://vahinitech.com');
    expect(pdf).toContain('metadata=vahini-pdf-v1');
    expect(pdf).toContain(`document-id=vh-${doc.getFileId().toLowerCase()}`);
    expect(pdf).toContain(`edition=${edition}, paper=${paper}, source-revision=${revision}`);
}

describe('Vahini PDF metadata', () => {
    test.each(EDITIONS.flatMap((e) => e.papers.map((paper) => [e.id, paper, e.title])))('%s %s embeds attribution and provenance', (id, paper, title) => {
        checkMetadata(buildEdition(id, paper), title, paper, id);
    });

    test('custom documents and supplied documents receive the same attribution', () => {
        const journal = new BulletJournal('My planner');
        checkMetadata(journal.createDocument('A4'), 'My planner', 'A4');
        checkMetadata(journal.generate('A4'), 'My planner', 'A4');
        checkMetadata(journal.generate('A4', new jsPDF()), 'My planner', 'A4');
    });

    test('revision and options identify an edition reproducibly without naming its owner in metadata', () => {
        const sourceRevision = 'a'.repeat(40);
        const options = { sourceRevision, owner: 'Private Name' };
        const a = buildEdition('habit-tracker', 'A5', options);
        const b = buildEdition('habit-tracker', 'A5', options);
        checkMetadata(a, 'Habit Tracker', 'A5', 'habit-tracker', sourceRevision);
        expect(a.output()).toBe(b.output());
        expect(a.getFileId()).not.toBe(buildEdition('habit-tracker', 'A5', { ...options, sourceRevision: 'b'.repeat(40) }).getFileId());
        expect(a.getFileId()).not.toBe(buildEdition('habit-tracker', 'A4', options).getFileId());
        expect(a.output().split('\n').find((line) => line.startsWith('/Keywords '))).not.toContain('Private Name');
    });

    test.each(['main', '', 'A'.repeat(40), 123, {}, 'a'.repeat(41)])('rejects invalid source revision %p', (sourceRevision) => {
        expect(() => buildEdition('habit-tracker', 'A5', { sourceRevision })).toThrow('sourceRevision must be');
    });
});
