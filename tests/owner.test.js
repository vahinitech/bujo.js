// The owner's name on the cover (constructor option and buildEdition
// option `owner`), against the real jsPDF.

import { Buffer } from 'node:buffer';
import { BulletJournal, PAPER_SIZES, EDITIONS, buildEdition, fitsStandardFonts, MAX_OWNER_CHARS } from '../src/bujo.js';
import { FOOTER, record } from './helpers/drawing.js';

const bytes = (doc) => Buffer.from(doc.output('arraybuffer'));

/** Builds an edition while recording what is drawn. */
function recorded(id, size, options) {
    let shapes;
    const original = BulletJournal.prototype.createDocument;
    BulletJournal.prototype.createDocument = function (paperSize) {
        const doc = original.call(this, paperSize);
        shapes = record(doc);
        return doc;
    };
    try {
        const doc = buildEdition(id, size, options);
        return { doc, shapes };
    } finally {
        BulletJournal.prototype.createDocument = original;
    }
}

describe('owner name', () => {
    test('no owner, or a blank one, gives exactly the bytes of the published edition', () => {
        EDITIONS.forEach((e) => {
            const plain = bytes(buildEdition(e.id, 'A5', { footer: FOOTER }));
            expect(bytes(buildEdition(e.id, 'A5', { footer: FOOTER, owner: '' })).equals(plain)).toBe(true);
            expect(bytes(buildEdition(e.id, 'A5', { footer: FOOTER, owner: '   ' })).equals(plain)).toBe(true);
        });
    });

    EDITIONS.filter((e) => e.id !== 'bullet-journal').forEach((edition) => {
        ['A4', 'A5'].forEach((size) => {
            test(`${edition.id} ${size}: the name sits on the "belongs to" line, on the cover only`, () => {
                const { doc, shapes } = recorded(edition.id, size, { footer: FOOTER, owner: 'Vahini' });
                expect(doc.getNumberOfPages()).toBe(edition.pages);
                const names = shapes.filter((s) => s.kind === 'text' && s.text === 'Vahini');
                expect(names).toHaveLength(1);
                const [name] = names;
                expect(name.page).toBe(1);
                const label = shapes.find((s) => s.page === 1 && s.text === 'This journal belongs to');
                // The rule is the cover's widest line below the label.
                const rule = shapes
                    .filter((s) => s.page === 1 && s.kind === 'line' && s.y1 === s.y2 && s.y1 > label.y1)
                    .sort((a, b) => a.y1 - b.y1)[0];
                expect(name.y1).toBeGreaterThan(label.y1);
                expect(name.y1).toBeLessThan(rule.y1);
                expect(name.x1).toBeGreaterThanOrEqual(rule.x1 - 0.01);
                expect(name.x2).toBeLessThanOrEqual(rule.x2 + 0.01);
                expect((name.x1 + name.x2) / 2).toBeCloseTo(PAPER_SIZES[size].width / 2, 1);
            });
        });
    });

    test('bullet-journal: the name sits between the tagline and the year line', () => {
        const { doc, shapes } = recorded('bullet-journal', 'A4', { owner: 'Seetha Rao' });
        expect(doc.getNumberOfPages()).toBe(EDITIONS.find((e) => e.id === 'bullet-journal').pages);
        const name = shapes.find((s) => s.text === 'Seetha Rao');
        const tagline = shapes.find((s) => s.text === 'An undated planner for intentional living');
        const year = shapes.find((s) => s.text === 'year');
        expect(name.page).toBe(1);
        expect(name.y1).toBeGreaterThan(tagline.y1);
        expect(name.y1).toBeLessThan(year.y1);
    });

    test('a long name shrinks to the line instead of running past it', () => {
        const long = 'Wolfeschlegelsteinhausenbergerdorff Smith'.slice(0, MAX_OWNER_CHARS);
        const { shapes } = recorded('habit-tracker', 'A5', { owner: long });
        const name = shapes.find((s) => s.text === long);
        const half = new BulletJournal()._layout(PAPER_SIZES.A5).contentW * 0.32;
        expect(name.x2 - name.x1).toBeLessThanOrEqual(half * 2 + 0.01);
    });

    test('the name is trimmed, spaces collapsed and capped at 40 characters', () => {
        expect(new BulletJournal('t', 'color', { owner: '  Arun   Kumar ' }).owner).toBe('Arun Kumar');
        expect(new BulletJournal('t', 'color', { owner: 'x'.repeat(60) }).owner).toHaveLength(MAX_OWNER_CHARS);
        expect(new BulletJournal('t', 'color', { owner: 42 }).owner).toBeNull();
    });

    test('a name changes the bytes, and the same name always gives the same bytes', () => {
        const plain = bytes(buildEdition('habit-tracker', 'A5', { footer: FOOTER }));
        const a = bytes(buildEdition('habit-tracker', 'A5', { footer: FOOTER, owner: 'Chinnu' }));
        const b = bytes(buildEdition('habit-tracker', 'A5', { footer: FOOTER, owner: 'Chinnu' }));
        expect(a.equals(plain)).toBe(false);
        expect(a.equals(b)).toBe(true);
    });

    test('names the built-in fonts cannot draw are refused, not printed as garbage', () => {
        expect(fitsStandardFonts('Zoë O’Brien – José')).toBe(true);
        expect(fitsStandardFonts('వాహిని')).toBe(false);
        expect(fitsStandardFonts('राम')).toBe(false);
        expect(fitsStandardFonts('Line\nbreak')).toBe(false);
        expect(() => buildEdition('habit-tracker', 'A5', { owner: 'వాహిని' }))
            .toThrow('Owner name has characters the built-in fonts cannot draw');
    });
});
