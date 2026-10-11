// Editions and the build script, against the real jsPDF and real files.

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { join, resolve } from 'node:path';
import { BulletJournal, PAPER_SIZES, EDITIONS, buildEdition } from '../src/bujo.js';
import { EPS, FOOTER, PT, record } from './helpers/drawing.js';

describe('footer on every edition page', () => {
    EDITIONS.forEach((edition) => {
        ['A4', 'A6'].forEach((size) => {
            test(`${edition.id} ${size}: footer on every page, clear of content and other footer text`, () => {
                const journal = new BulletJournal(edition.title, 'color', { footer: FOOTER });
                const L = journal._layout(PAPER_SIZES[size]);
                // Record through buildEdition by patching createDocument.
                let shapes;
                const original = BulletJournal.prototype.createDocument;
                BulletJournal.prototype.createDocument = function (paperSize) {
                    const doc = original.call(this, paperSize);
                    shapes = record(doc);
                    return doc;
                };
                let doc;
                try {
                    doc = buildEdition(edition.id, size, { footer: FOOTER });
                } finally {
                    BulletJournal.prototype.createDocument = original;
                }
                const pages = doc.getNumberOfPages();
                const footers = shapes.filter((s) => s.kind === 'text' && s.text === FOOTER);
                expect(new Set(footers.map((s) => s.page)).size).toBe(pages);
                expect(footers).toHaveLength(pages);

                for (let p = 2; p <= pages; p++) {
                    const onPage = shapes.filter((s) => s.page === p);
                    const footer = onPage.find((s) => s.kind === 'text' && s.text === FOOTER);
                    // Footer sits in the bottom margin, below everything else.
                    expect(footer.y1).toBeGreaterThan(L.bottom);
                    expect(footer.y1).toBeLessThan(L.h);
                    onPage
                        .filter((s) => s !== footer && s.y1 <= L.bottom + EPS)
                        .forEach((s) => expect(s.y2).toBeLessThan(footer.y1 - footer.size * PT * 0.75));
                    // No horizontal overlap with the page label or number.
                    onPage
                        .filter((s) => s.kind === 'text' && s !== footer && s.y1 === footer.y1)
                        .forEach((s) => expect(s.x2 <= footer.x1 || s.x1 >= footer.x2).toBe(true));
                }
            });
        });
    });

});

describe('editions', () => {
    test('every edition has the published fields', () => {
        expect(EDITIONS.map((e) => e.id)).toEqual([
            'kids-handwriting-journal',
            'handwriting-practice-pages',
            'student-study-planner',
            'habit-tracker',
            'bullet-journal'
        ]);
        EDITIONS.forEach((e) => {
            expect(e.title).toEqual(expect.any(String));
            expect(e.description).toMatch(/\.$/);
            expect(e.papers).toEqual(['A4', 'A5']);
            expect(Number.isInteger(e.pages)).toBe(true);
        });
        expect(Object.fromEntries(EDITIONS.map((e) => [e.id, e.pages]))).toEqual({
            'kids-handwriting-journal': 29,
            'handwriting-practice-pages': 11,
            'student-study-planner': 17,
            'habit-tracker': 13,
            'bullet-journal': 66
        });
    });

    EDITIONS.forEach((edition) => {
        ['A4', 'A5'].forEach((size) => {
            test(`${edition.id} ${size} has exactly ${edition.pages} pages of the right size`, () => {
                const doc = buildEdition(edition.id, size);
                expect(doc.getNumberOfPages()).toBe(edition.pages);
                const { width, height } = doc.internal.pageSize;
                expect(width).toBeCloseTo(PAPER_SIZES[size].width, 1);
                expect(height).toBeCloseTo(PAPER_SIZES[size].height, 1);
            });
        });
    });

    test('the bullet-journal edition matches the full book', () => {
        expect(buildEdition('bullet-journal', 'A5').getNumberOfPages()).toBe(new BulletJournal().getExpectedPageCount());
    });

    test('unknown editions and papers are refused', () => {
        expect(() => buildEdition('nope', 'A4')).toThrow('Unknown edition: nope');
        expect(() => buildEdition('habit-tracker', 'Letter')).toThrow('Unsupported paper size');
    });

    test('the same edition always gives the same bytes', () => {
        const a = Buffer.from(buildEdition('habit-tracker', 'A5', { footer: FOOTER }).output('arraybuffer'));
        const b = Buffer.from(buildEdition('habit-tracker', 'A5', { footer: FOOTER }).output('arraybuffer'));
        expect(a.equals(b)).toBe(true);
        expect(a.toString('latin1')).toContain("/CreationDate (D:20240101000000+00'00')");
    });
});

describe('build-printables script', () => {
    const script = resolve(__dirname, '..', 'scripts', 'build-printables.mjs');
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
    const dirs = [];
    const build = (...extra) => {
        const out = mkdtempSync(join(tmpdir(), 'bujo-printables-'));
        dirs.push(out);
        execFileSync(process.execPath, [script, '--out', out, ...extra], { stdio: 'pipe' });
        return out;
    };
    afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

    test('writes every edition on A4 and A5 plus a manifest, deterministically', () => {
        const first = build('--footer', FOOTER);
        const second = build('--footer', FOOTER);

        const expected = EDITIONS.flatMap((e) => ['a4', 'a5'].map((p) => `${e.id}-${p}.pdf`));
        expect(readdirSync(first).sort()).toEqual([...expected, 'manifest.json'].sort());

        const manifest = JSON.parse(readFileSync(join(first, 'manifest.json'), 'utf8'));
        expect(manifest.generator).toBe('bujo.js');
        expect(manifest.version).toBe(pkg.version);
        expect(manifest.commit === null || /^[0-9a-f]{40}$/.test(manifest.commit)).toBe(true);
        expect(manifest.footer).toBe(FOOTER);
        expect(manifest.files.map((f) => f.file)).toEqual(expected);

        manifest.files.forEach((entry) => {
            const edition = EDITIONS.find((e) => e.id === entry.id);
            expect(Object.keys(entry)).toEqual(['id', 'title', 'description', 'paper', 'pages', 'file', 'bytes', 'sha256']);
            expect(entry.title).toBe(edition.title);
            expect(entry.description).toBe(edition.description);
            expect(entry.pages).toBe(edition.pages);
            expect(entry.file).toBe(`${entry.id}-${entry.paper.toLowerCase()}.pdf`);
            const bytes = readFileSync(join(first, entry.file));
            expect(entry.bytes).toBe(bytes.length);
            expect(entry.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
            // Second build: byte-identical.
            const again = readFileSync(join(second, entry.file));
            expect(createHash('sha256').update(again).digest('hex')).toBe(entry.sha256);
        });
    });

    test('without --footer the manifest records null', () => {
        const out = build();
        const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
        expect(manifest.footer).toBeNull();
    });

    test('rejects unknown arguments', () => {
        expect(() => execFileSync(process.execPath, [script, '--colour'], { stdio: 'pipe' })).toThrow();
    });
});
