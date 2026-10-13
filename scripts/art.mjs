// Loads the pictures in art/ for the `art` option of buildEdition.
//
// art/ is not part of the npm package (package.json "files" lists src
// only): the pictures are Vahini artwork under their own terms, see
// art/NOTICE.md. scripts/export_art.py writes them from vahinitech/drawings.

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ART_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'art');

/**
 * Reads art/art.json and every picture it lists, checking each file
 * against its recorded digest. Returns { art, source }: `art` maps each
 * id to { data, width, height }, `source` is the drawings pin.
 */
function loadArt(dir = ART_DIR) {
    const spec = JSON.parse(readFileSync(join(dir, 'art.json'), 'utf8'));
    const art = {};
    spec.items.forEach((item) => {
        const bytes = readFileSync(join(dir, `${item.id}.png`));
        const digest = createHash('sha256').update(bytes).digest('hex');
        if (digest !== item.sha256) {
            throw new Error(`art/${item.id}.png does not match art.json; run scripts/export_art.py`);
        }
        art[item.id] = { data: new Uint8Array(Buffer.from(bytes)), width: item.width, height: item.height };
    });
    return { art, source: spec.source };
}

export { ART_DIR, loadArt };
