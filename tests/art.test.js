// The pictures from vahinitech/drawings: what art/ holds, which editions
// use them, and where they land on the page.

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BulletJournal, PAPER_SIZES, EDITIONS, COVER_PICTURES, buildEdition, usedPictures } from '../src/bujo.js';
import { ART_DIR, EPS, FOOTER, loadTestArt, newDoc, record } from './helpers/drawing.js';

const { art, spec } = loadTestArt();

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

describe('art/', () => {
    test('is pinned to a drawings commit and lists each collection with its inventory digest', () => {
        expect(spec.source.repository).toBe('https://github.com/vahinitech/drawings');
        expect(spec.source.commit).toMatch(/^[0-9a-f]{40}$/);
        spec.source.collections.forEach((c) => {
            expect(c.path).toMatch(/^illustrations\//);
            expect(c.inventorySha256).toMatch(/^[0-9a-f]{64}$/);
        });
    });

    test('every listed picture is on disk with the recorded digest and size, and nothing else is', () => {
        spec.items.forEach((item) => {
            const bytes = readFileSync(join(ART_DIR, `${item.id}.png`));
            expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.sha256);
            // PNG header: width and height are big-endian at bytes 16 and 20.
            expect(bytes.readUInt32BE(16)).toBe(item.width);
            expect(bytes.readUInt32BE(20)).toBe(item.height);
            expect(item.masterSha256).toMatch(/^[0-9a-f]{64}$/);
            expect(item.master).toMatch(/^illustrations\/.+\.png$/);
        });
        const pngs = readdirSync(ART_DIR).filter((f) => f.endsWith('.png')).sort();
        expect(pngs).toEqual(spec.items.map((i) => `${i.id}.png`).sort());
    });

    test('carries a notice that the pictures are not under the MIT licence', () => {
        const notice = readFileSync(join(ART_DIR, 'NOTICE.md'), 'utf8').replace(/\*\*/g, '').replace(/\s+/g, ' ');
        expect(notice).toMatch(/not covered by the MIT licence/i);
        const pkg = JSON.parse(readFileSync(join(ART_DIR, '..', 'package.json'), 'utf8'));
        expect(pkg.files).toEqual(['src']);
    });

    test('has exactly the pictures the editions use', () => {
        const used = new Set(EDITIONS.flatMap((e) => usedPictures(e.id)));
        expect([...used].sort()).toEqual(spec.items.map((i) => i.id).sort());
        EDITIONS.forEach((e) => expect(usedPictures(e.id)).toEqual(expect.arrayContaining(COVER_PICTURES[e.id])));
    });
});

describe('editions with pictures', () => {
    EDITIONS.forEach((edition) => {
        ['A4', 'A5'].forEach((size) => {
            test(`${edition.id} ${size}: same page count, every picture on the page and inside the frame`, () => {
                const { doc, shapes } = recorded(edition.id, size, { footer: FOOTER, art });
                expect(doc.getNumberOfPages()).toBe(edition.pages);
                const L = new BulletJournal()._layout(PAPER_SIZES[size]);
                const images = shapes.filter((s) => s.kind === 'addImage');
                expect(new Set(images.map((s) => s.alias))).toEqual(new Set(usedPictures(edition.id).map((id) => `art-${id}`)));
                images.forEach((s) => {
                    expect(s.x1).toBeGreaterThanOrEqual(L.margin - EPS);
                    expect(s.x2).toBeLessThanOrEqual(L.right + EPS);
                    expect(s.y1).toBeGreaterThanOrEqual(L.margin - EPS);
                    expect(s.y2).toBeLessThanOrEqual(L.bottom + EPS);
                });
            });
        });
    });

    test('pictures do not change the bytes from build to build', () => {
        const a = Buffer.from(buildEdition('teacher-planner', 'A5', { footer: FOOTER, art }).output('arraybuffer'));
        const b = Buffer.from(buildEdition('teacher-planner', 'A5', { footer: FOOTER, art }).output('arraybuffer'));
        expect(a.equals(b)).toBe(true);
    });

    test('each picture is stored once per document however often it is drawn', () => {
        // chinnu_try is on three experiment pages of the children's journal.
        const pdf = Buffer.from(buildEdition('kids-handwriting-journal', 'A5', { art }).output('arraybuffer')).toString('latin1');
        const images = pdf.match(/\/Subtype \/Image/g).length;
        // One image and one soft mask (the transparency) per picture.
        expect(images).toBe(usedPictures('kids-handwriting-journal').length * 2);
    });

    test('without pictures every edition still builds with the same pages', () => {
        EDITIONS.forEach((e) => expect(buildEdition(e.id, 'A4').getNumberOfPages()).toBe(e.pages));
    });
});

describe('covers with pictures', () => {
    ['A6', 'A5', 'A4', 'A3'].forEach((size) => {
        test(`name cover on ${size}: pictures sit between the title and the name line`, () => {
            const journal = new BulletJournal('Cover', 'color', { footer: FOOTER, art });
            const doc = newDoc(journal, size);
            const shapes = record(doc);
            journal.addNameCoverPage(doc, PAPER_SIZES[size], {
                title: 'My Handwriting Journal',
                subtitle: 'Ten minutes a day of careful writing',
                pictures: ['role_student', 'mascot_practice']
            });
            const L = journal._layout(PAPER_SIZES[size]);
            const images = shapes.filter((s) => s.kind === 'addImage');
            expect(images).toHaveLength(2);
            const subtitle = shapes.find((s) => s.text === 'Ten minutes a day of careful writing');
            const belongs = shapes.find((s) => s.text === 'This journal belongs to');
            images.forEach((img) => {
                expect(img.y1).toBeGreaterThan(subtitle.y1);
                expect(img.y2).toBeLessThan(belongs.y1 - 2);
                expect(img.x1).toBeGreaterThanOrEqual(L.margin - EPS);
                expect(img.x2).toBeLessThanOrEqual(L.right + EPS);
            });
            // Standing on one floor.
            expect(Math.abs(images[0].y2 - images[1].y2)).toBeLessThan(EPS);
            shapes.filter((s) => s.kind === 'text').forEach((t) => expect(Math.abs((t.x1 + t.x2) / 2 - L.centerX)).toBeLessThan(0.5));
        });

        test(`bullet journal cover on ${size}: the picture sits between the tagline and the year`, () => {
            const journal = new BulletJournal('Bullet Journal', 'color', { art, owner: 'Asha' });
            const doc = newDoc(journal, size);
            const shapes = record(doc);
            journal.addCoverPage(doc, PAPER_SIZES[size], { pictures: ['feature_write'] });
            const [img] = shapes.filter((s) => s.kind === 'addImage');
            const owner = shapes.find((s) => s.text === 'Asha');
            const year = shapes.find((s) => s.text === 'year');
            expect(img.y1).toBeGreaterThan(owner.y1);
            expect(img.y2).toBeLessThan(year.y1 - 2);
        });
    });

    test('a picture id that is not in the art option is left out, not an error', () => {
        const journal = new BulletJournal('Cover', 'color', { art });
        const doc = newDoc(journal, 'A4');
        const shapes = record(doc);
        journal.addNameCoverPage(doc, PAPER_SIZES.A4, { pictures: ['no_such_picture'] });
        expect(shapes.some((s) => s.kind === 'addImage')).toBe(false);
        // And the words keep the layout of a cover without pictures.
        expect(shapes.find((s) => s.text === 'This journal belongs to').y1).toBeCloseTo(PAPER_SIZES.A4.height * 0.68, 5);
    });

    test('unusable art entries are dropped', () => {
        const journal = new BulletJournal('x', 'color', {
            art: { a: { data: 'not bytes', width: 1, height: 1 }, b: { data: new Uint8Array(4), width: 0, height: 5 }, c: null }
        });
        expect(journal.art).toEqual({});
    });
});
