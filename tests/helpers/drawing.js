// Shared helpers for the tests that run against the real jsPDF.

import { PAPER_SIZES } from '../../src/bujo.js';

export const FOOTER = 'Free handwriting check: vahinitech.com';
export const PT = 25.4 / 72;
export const EPS = 0.01;

/**
 * Wraps the drawing calls of a real document and records every shape and
 * text with its extents in millimetres and the page it landed on.
 */
export function record(doc) {
    const shapes = [];
    const page = () => doc.getCurrentPageInfo().pageNumber;
    const wrap = (name, toBox) => {
        const original = doc[name].bind(doc);
        doc[name] = (...args) => {
            shapes.push({ kind: name, page: page(), ...toBox(...args) });
            return original(...args);
        };
    };
    wrap('line', (x1, y1, x2, y2) => ({
        x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: Math.min(y1, y2), y2: Math.max(y1, y2)
    }));
    wrap('rect', (x, y, w, h) => ({ x1: x, x2: x + w, y1: y, y2: y + h }));
    wrap('roundedRect', (x, y, w, h) => ({ x1: x, x2: x + w, y1: y, y2: y + h }));
    wrap('circle', (x, y, r) => ({ x1: x - r, x2: x + r, y1: y - r, y2: y + r }));
    wrap('text', (text, x, y, opts = {}) => {
        let w = doc.getTextWidth(String(text));
        if (opts.maxWidth) w = Math.min(w, opts.maxWidth);
        const x1 = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
        return { text: String(text), x1, x2: x1 + w, y1: y, y2: y, size: doc.getFontSize() };
    });
    return shapes;
}

export function newDoc(journal, size) {
    const doc = journal.createDocument(size);
    journal._paper = PAPER_SIZES[size];
    journal._pageNo = 1;
    journal.applyColors(doc);
    return doc;
}
