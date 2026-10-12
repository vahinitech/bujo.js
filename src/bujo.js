import { jsPDF } from 'jspdf';
import { applyColorScheme } from './utils/colorScheme.js';

/**
 * Paper sizes in millimetres (portrait).
 * jsPDF documents are always created with `unit: 'mm'`, so every layout
 * computation in this file is in millimetres.
 */
const PAPER_SIZES = {
    A3: { width: 297, height: 420 },
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    A6: { width: 105, height: 148 }
};

const MONTH_SECTION_PAGES = 4; // dot grid, daily, weekly, tracker
const MONTHS = 12;
const MAX_FOOTER_CHARS = 120;
const MAX_OWNER_CHARS = 40;

/*
 * Characters the built-in PDF fonts (Helvetica, Times) can draw: jsPDF
 * writes them with WinAnsiEncoding, which is Latin-1 plus these.
 */
const WIN_ANSI_EXTRA = '\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d'
    + '\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178';

/**
 * True when every character of `text` can be drawn by the built-in fonts.
 * Names in other scripts (Telugu, Hindi, Tamil...) need an embedded font,
 * which this library does not ship, so callers check before passing them.
 */
function fitsStandardFonts(text) {
    return [...String(text)].every((ch) => {
        const code = ch.codePointAt(0);
        return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.includes(ch);
    });
}

/** Trims, collapses spaces and caps an owner's name; null when empty. */
function cleanOwner(value) {
    if (typeof value !== 'string') return null;
    const name = value.replace(/\s+/g, ' ').trim().slice(0, MAX_OWNER_CHARS).trim();
    return name || null;
}

/**
 * Older releases expressed paper sizes in inches. Any dimension small
 * enough to be an inch measurement is converted to millimetres so
 * existing callers keep working.
 */
function toMillimetres(paperDimensions) {
    if (!paperDimensions) return paperDimensions;
    const { width, height } = paperDimensions;
    if (width < 20 && height < 20) {
        return { width: width * 25.4, height: height * 25.4 };
    }
    return paperDimensions;
}

class BulletJournal {
    /**
     * @param {string} title
     * @param {'color'|'monochrome'} colorScheme
     * @param {Object} [options]
     * @param {string} [options.footer] Text printed centred in the bottom
     *   margin of every page, e.g. a web address. Off when not set.
     * @param {string} [options.owner] Name printed on the cover, up to 40
     *   characters the built-in fonts can draw (see fitsStandardFonts).
     *   Off when not set: the cover keeps its blank line to write on.
     */
    constructor(title = 'My Bullet Journal', colorScheme = 'color', options = {}) {
        this.title = title;
        this.colorScheme = colorScheme;
        const footer = options && typeof options.footer === 'string' ? options.footer.trim() : '';
        this.footerText = footer ? footer.slice(0, MAX_FOOTER_CHARS) : null;
        this.owner = cleanOwner(options && options.owner);
        if (this.owner && !fitsStandardFonts(this.owner)) {
            throw new Error('Owner name has characters the built-in fonts cannot draw');
        }
        this.colors = applyColorScheme(null, colorScheme);
        this._paper = PAPER_SIZES.A4;
        this._pageNo = 0;
    }

    /* ------------------------------------------------------------------ *
     *  Layout helpers                                                     *
     * ------------------------------------------------------------------ */

    applyColors(doc) {
        const colors = applyColorScheme(doc, this.colorScheme);
        this.colors = colors;
        doc.setTextColor(colors.textColor);
        doc.setDrawColor(colors.lineColor);
    }

    /**
     * Derives every metric a page needs from the paper dimensions, so the
     * same layout scales cleanly from A6 up to A3.
     */
    _layout(paperDimensions) {
        const paper = toMillimetres(paperDimensions) || this._paper;
        const w = paper.width;
        const h = paper.height;
        const s = Math.max(0.2, w / PAPER_SIZES.A4.width); // scale vs A4
        const f = Math.min(1.5, Math.max(0.55, s));        // font scale
        const margin = Math.max(6, 13 * s);
        return {
            w,
            h,
            s,
            f,
            margin,
            contentW: Math.max(1, w - margin * 2),
            contentH: Math.max(1, h - margin * 2),
            right: w - margin,
            bottom: h - margin,
            centerX: w / 2,
            rowH: Math.max(3.2, 8 * s),
            box: Math.max(1.6, 3.2 * s) // checkbox edge length
        };
    }

    _fonts(L) {
        return {
            display: 30 * L.f,
            title: 15 * L.f,
            heading: 10.5 * L.f,
            body: 9 * L.f,
            small: 7.5 * L.f,
            tiny: 6.2 * L.f
        };
    }

    _setStroke(doc, color, width) {
        doc.setDrawColor(color);
        if (typeof doc.setLineWidth === 'function') doc.setLineWidth(width);
    }

    _kicker(doc, L, text, x, y, align = 'left') {
        const F = this._fonts(L);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.tiny);
        doc.setTextColor(this.colors.subtle);
        const label = String(text).toUpperCase();
        const charSpace = 0.6 * L.f;
        // jsPDF's own centring does not allow for the full letter spacing,
        // so spaced kickers drifted right. Work out the left edge here from
        // the unspaced width plus the gaps between letters.
        let ax = x;
        const measured = align !== 'left' && typeof doc.getTextWidth === 'function';
        if (measured) {
            if (typeof doc.setCharSpace === 'function') doc.setCharSpace(0);
            const width = doc.getTextWidth(label) + charSpace * Math.max(0, label.length - 1);
            ax = align === 'center' ? x - width / 2 : x - width;
        }
        if (typeof doc.setCharSpace === 'function') doc.setCharSpace(charSpace);
        doc.text(label, ax, y, measured ? {} : { align });
        if (typeof doc.setCharSpace === 'function') doc.setCharSpace(0);
    }

    /**
     * Standard page header: small uppercase kicker, page title and a short
     * accent rule. Returns the y coordinate where content may start.
     */
    _header(doc, L, kicker, title) {
        const F = this._fonts(L);
        this._kicker(doc, L, kicker, L.margin, L.margin);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.title);
        doc.setTextColor(this.colors.ink);
        doc.text(title, L.margin, L.margin + 7.5 * L.s);
        this._setStroke(doc, this.colors.accent, 0.7 * L.s);
        doc.line(L.margin, L.margin + 10.5 * L.s, L.margin + 16 * L.s, L.margin + 10.5 * L.s);
        return L.margin + 16 * L.s;
    }

    _footer(doc, L, label) {
        const F = this._fonts(L);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.tiny);
        doc.setTextColor(this.colors.subtle);
        const y = L.h - Math.max(4, L.margin * 0.45);
        const labelText = String(label || this.title).toUpperCase();
        const numberText = this._pageNo > 0 ? String(this._pageNo) : '';

        // The optional site footer sits centred on the same baseline. If a
        // long label would run into it, the label gives way: the footer is
        // the one line the publisher asked for on every page.
        let showLabel = true;
        if (this.footerText) {
            const gap = 3 * L.s;
            const footerW = this._textWidth(doc, this.footerText, F.tiny);
            const labelW = this._textWidth(doc, labelText, F.tiny);
            const numberW = numberText ? this._textWidth(doc, numberText, F.tiny) : 0;
            const leftEdge = L.centerX - footerW / 2;
            const rightEdge = L.centerX + footerW / 2;
            showLabel = L.margin + labelW + gap <= leftEdge;
            if (rightEdge + gap > L.right - numberW) {
                // Not even the page number leaves room: drop to a smaller size.
                this._siteFooter(doc, L, y, Math.max(0, (L.right - numberW - gap - L.centerX) * 2));
            } else {
                this._siteFooter(doc, L, y);
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.tiny);
            doc.setTextColor(this.colors.subtle);
        }
        if (showLabel) doc.text(labelText, L.margin, y);
        if (numberText) {
            doc.text(numberText, L.right, y, { align: 'right' });
        }
    }

    /** Width of `text` in millimetres at `size` pt, or an estimate without a real document. */
    _textWidth(doc, text, size) {
        if (typeof doc.getTextWidth === 'function' && typeof doc.getFontSize === 'function') {
            const before = doc.getFontSize();
            doc.setFontSize(size);
            const width = doc.getTextWidth(String(text));
            doc.setFontSize(before);
            return width;
        }
        // Helvetica averages a little over half an em per character.
        return String(text).length * size * 0.56 * (25.4 / 72);
    }

    /**
     * Draws the publisher footer (constructor option `footer`) centred at
     * baseline `y`. `maxWidth` shrinks the type when the line is too long.
     */
    _siteFooter(doc, L, y, maxWidth = L.contentW) {
        if (!this.footerText) return;
        const F = this._fonts(L);
        let size = F.tiny;
        const width = this._textWidth(doc, this.footerText, size);
        if (width > maxWidth && maxWidth > 0) size = size * (maxWidth / width);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(size);
        doc.setTextColor(this.colors.subtle);
        doc.text(this.footerText, L.centerX, y, { align: 'center' });
    }

    /** The owner's name centred at baseline `y`, shrunk to fit `maxWidth`. */
    _ownerName(doc, L, y, maxWidth) {
        const F = this._fonts(L);
        let size = F.title;
        const width = this._textWidth(doc, this.owner, size);
        if (width > maxWidth && maxWidth > 0) size = size * (maxWidth / width);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(this.colors.ink);
        doc.text(this.owner, L.centerX, y, { align: 'center' });
    }

    /** Footer position on a cover: inside the inner frame, near the bottom. */
    _coverFooter(doc, L) {
        const inner = L.margin * 0.55 + 1.6 * L.s;
        this._siteFooter(doc, L, L.h - inner - 3.5 * L.s, L.w - inner * 2 - 4 * L.s);
    }

    /** Splits text into lines that fit `width`; one line when the document cannot measure. */
    _wrap(doc, text, width) {
        if (typeof doc.splitTextToSize === 'function') return doc.splitTextToSize(String(text), width);
        return [String(text)];
    }

    /** Rounded box in the page style, with a plain rectangle as fallback. */
    _box(doc, L, x, y, w, h, color, style) {
        this._setStroke(doc, color || this.colors.line, 0.25 * L.s);
        if (typeof doc.roundedRect === 'function') {
            doc.roundedRect(x, y, w, h, 1.2 * L.s, 1.2 * L.s, style);
        } else {
            doc.rect(x, y, w, h, style);
        }
    }

    /** Five-pointed star outline centred on (cx, cy), drawn from straight lines. */
    _star(doc, L, cx, cy, r) {
        const points = [];
        for (let k = 0; k < 10; k++) {
            const radius = k % 2 === 0 ? r : r * 0.45;
            const angle = -Math.PI / 2 + (k * Math.PI) / 5;
            points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
        }
        this._setStroke(doc, this.colors.subtle, 0.22 * L.s);
        for (let k = 0; k < 10; k++) {
            const [x1, y1] = points[k];
            const [x2, y2] = points[(k + 1) % 10];
            doc.line(x1, y1, x2, y2);
        }
    }

    /** Label and fill-in rule on one line, e.g. "name ______". */
    _fillIn(doc, L, label, x1, x2, y) {
        const F = this._fonts(L);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.subtle);
        doc.text(label, x1, y);
        const start = x1 + this._textWidth(doc, label, F.small) + 1.5 * L.s;
        this._rule(doc, L, start, x2, y + 0.8 * L.s);
    }

    _newPage(doc) {
        doc.addPage();
        this._pageNo += 1;
    }

    /** A light ruled line used for writing space. */
    _rule(doc, L, x1, x2, y) {
        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        doc.line(x1, y, x2, y);
    }

    /** Small square checkbox sitting on a writing rule. */
    _checkboxRow(doc, L, x1, x2, y) {
        this._setStroke(doc, this.colors.subtle, 0.25 * L.s);
        doc.rect(x1, y - L.box, L.box, L.box);
        this._rule(doc, L, x1 + L.box + 1.5 * L.s, x2, y);
    }

    /* ------------------------------------------------------------------ *
     *  Pages                                                              *
     * ------------------------------------------------------------------ */

    /** Cover — drawn on the CURRENT page (a fresh document's first page). */
    addCoverPage(doc, paperDimensions) {
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);

        // Delicate double frame.
        const o = L.margin * 0.55;
        this._setStroke(doc, this.colors.accent, 0.5 * L.s);
        doc.rect(o, o, L.w - o * 2, L.h - o * 2);
        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        const i = o + 1.6 * L.s;
        doc.rect(i, i, L.w - i * 2, L.h - i * 2);

        // Masthead.
        this._kicker(doc, L, 'Bullet Journal', L.centerX, L.h * 0.34, 'center');
        this._setStroke(doc, this.colors.accent, 0.5 * L.s);
        doc.line(L.centerX - 11 * L.s, L.h * 0.37, L.centerX + 11 * L.s, L.h * 0.37);

        // Title.
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.display);
        doc.setTextColor(this.colors.ink);
        doc.text(this.title, L.centerX, L.h * 0.455, { align: 'center', maxWidth: L.contentW * 0.9 });

        // Tagline.
        doc.setFont('times', 'italic');
        doc.setFontSize(F.body);
        doc.setTextColor(this.colors.subtle);
        doc.text('An undated planner for intentional living', L.centerX, L.h * 0.52, { align: 'center' });

        if (this.owner) this._ownerName(doc, L, L.h * 0.575, L.contentW * 0.8);

        // Year fill-in.
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.text('year', L.centerX, L.h * 0.62, { align: 'center' });
        this._rule(doc, L, L.centerX - 12 * L.s, L.centerX + 12 * L.s, L.h * 0.655);

        // Signature dots.
        doc.setFillColor(this.colors.accent);
        for (let d = -1; d <= 1; d++) {
            doc.circle(L.centerX + d * 4 * L.s, L.h * 0.8, 0.55 * L.s, 'F');
        }
        this._coverFooter(doc, L);
    }

    /** Index with real page numbers for every generated section. */
    addIndexPage(doc, paperDimensions) {
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, 'Contents', 'Index');

        const entries = this._indexEntries();
        const gutter = 6 * L.s;
        const colW = (L.contentW - gutter) / 2;
        const rowH = Math.max(4, 8.2 * L.s);
        const rowsPerCol = Math.max(1, Math.floor((L.bottom - top - rowH) / rowH));

        doc.setFont('helvetica', 'normal');
        for (let r = 0; r < rowsPerCol * 2; r++) {
            const col = Math.floor(r / rowsPerCol);
            const x1 = L.margin + col * (colW + gutter);
            const x2 = x1 + colW;
            const y = top + rowH * (1 + (r % rowsPerCol));
            this._rule(doc, L, x1, x2, y);
            const entry = entries[r];
            if (entry) {
                doc.setFontSize(F.body);
                doc.setTextColor(this.colors.ink);
                doc.text(entry.label, x1, y - 1.2 * L.s);
                doc.setFontSize(F.small);
                doc.setTextColor(this.colors.subtle);
                doc.text(String(entry.page), x2, y - 1.2 * L.s, { align: 'right' });
            }
        }
        this._footer(doc, L, 'Index');
    }

    _indexEntries() {
        // Page layout: 1 cover, 2 index, 3 future-log intro, 4–15 future log,
        // 16–17 milestones, 18 year at a glance, then 4 pages per month.
        const entries = [
            { label: 'Future Log', page: 3 },
            { label: 'Milestones · Top 30', page: 16 },
            { label: 'Milestones · Yearly', page: 17 },
            { label: 'Year at a Glance', page: 18 }
        ];
        for (let m = 1; m <= MONTHS; m++) {
            entries.push({ label: `Month ${m}`, page: 19 + (m - 1) * MONTH_SECTION_PAGES });
        }
        return entries;
    }

    /** Future log: an intro page plus one undated calendar page per month. */
    addUndatedCalendarPages(doc, paperDimensions) {
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);

        // Intro page.
        this._newPage(doc);
        const top = this._header(doc, L, 'Plan Ahead', 'Future Log');
        doc.setFont('times', 'italic');
        doc.setFontSize(F.body);
        doc.setTextColor(this.colors.subtle);
        doc.text(
            'Twelve undated months. Date them as you go, and log the events, deadlines and dreams that belong to the months ahead.',
            L.margin,
            top + 4 * L.s,
            { maxWidth: L.contentW * 0.85 }
        );
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.ink);
        const yearY = top + 22 * L.s;
        doc.text('This journal begins', L.margin, yearY);
        this._rule(doc, L, L.margin + 30 * L.s, L.margin + 62 * L.s, yearY + 0.8 * L.s);
        this._footer(doc, L, 'Future Log');

        // Twelve month pages.
        for (let month = 1; month <= MONTHS; month++) {
            this._newPage(doc);
            this._monthCalendarPage(doc, L, month);
        }
    }

    _monthCalendarPage(doc, L, month) {
        const F = this._fonts(L);
        const top = this._header(doc, L, `Future Log · ${month} of 12`, `Month ${month}`);

        // Fill-in name line beside the title block.
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.subtle);
        doc.text('month of', L.right - 34 * L.s, L.margin + 7.5 * L.s, { align: 'right' });
        this._rule(doc, L, L.right - 32 * L.s, L.right, L.margin + 8.3 * L.s);

        // 7×6 calendar grid.
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const gridTop = top + 5 * L.s;
        const cellW = L.contentW / 7;
        const gridH = Math.min(L.contentH * 0.58, cellW * 6.6);
        const cellH = gridH / 6;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.subtle);
        for (let d = 0; d < 7; d++) {
            doc.text(days[d], L.margin + cellW * (d + 0.5), gridTop - 1.6 * L.s, { align: 'center' });
        }
        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        for (let r = 0; r <= 6; r++) {
            doc.line(L.margin, gridTop + r * cellH, L.right, gridTop + r * cellH);
        }
        for (let c = 0; c <= 7; c++) {
            doc.line(L.margin + c * cellW, gridTop, L.margin + c * cellW, gridTop + gridH);
        }
        // Date slot dot in each cell corner.
        doc.setFillColor(this.colors.faint);
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 7; c++) {
                doc.circle(L.margin + c * cellW + 1.8 * L.s, gridTop + r * cellH + 1.8 * L.s, 0.35 * L.s, 'F');
            }
        }

        // Notes rules below the grid.
        const notesTop = gridTop + gridH + 7 * L.s;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.ink);
        doc.text('Notes', L.margin, notesTop);
        const rows = Math.max(0, Math.floor((L.bottom - notesTop - 3 * L.s) / L.rowH));
        for (let r = 1; r <= rows; r++) {
            this._rule(doc, L, L.margin, L.right, notesTop + r * L.rowH);
        }
        this._footer(doc, L, `Month ${month}`);
    }

    /** Top 30 milestones (two columns) and top 10 yearly milestones. */
    addTopMilestonesPage(doc, paperDimensions) {
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);

        // Page 1 — top 30 in two columns.
        this._newPage(doc);
        let top = this._header(doc, L, 'Milestones', 'Top 30 Milestones');
        const gutter = 7 * L.s;
        const colW = (L.contentW - gutter) / 2;
        const rowH = Math.max(4.2, (L.bottom - top - 6 * L.s) / 15);
        doc.setFont('helvetica', 'normal');
        for (let n = 0; n < 30; n++) {
            const col = Math.floor(n / 15);
            const x1 = L.margin + col * (colW + gutter);
            const y = top + 5 * L.s + (n % 15) * rowH + rowH * 0.6;
            doc.setFontSize(F.tiny);
            doc.setTextColor(this.colors.subtle);
            doc.text(String(n + 1).padStart(2, '0'), x1, y - 0.4 * L.s);
            this._checkboxRow(doc, L, x1 + 4.5 * L.s, x1 + colW, y);
        }
        this._footer(doc, L, 'Milestones');

        // Page 2 — top 10 yearly, generous spacing.
        this._newPage(doc);
        top = this._header(doc, L, 'Milestones', 'Top 10 Yearly Milestones');
        const rowH2 = Math.max(6, (L.bottom - top - 6 * L.s) / 10);
        for (let n = 0; n < 10; n++) {
            const y = top + 5 * L.s + n * rowH2 + rowH2 * 0.55;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.heading);
            doc.setTextColor(this.colors.faint);
            doc.text(String(n + 1).padStart(2, '0'), L.margin, y);
            this._checkboxRow(doc, L, L.margin + 9 * L.s, L.right, y);
        }
        this._footer(doc, L, 'Milestones');
    }

    /** Year at a glance — twelve mini month panels. */
    addHelicopterOverviewPage(doc, paperDimensions) {
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, 'Helicopter View', 'Year at a Glance');

        const cols = 3;
        const rows = 4;
        const gap = 4 * L.s;
        const boxW = (L.contentW - gap * (cols - 1)) / cols;
        const boxH = (L.bottom - top - 4 * L.s - gap * (rows - 1)) / rows;
        for (let m = 0; m < MONTHS; m++) {
            const x = L.margin + (m % cols) * (boxW + gap);
            const y = top + 4 * L.s + Math.floor(m / cols) * (boxH + gap);
            this._setStroke(doc, this.colors.line, 0.25 * L.s);
            if (typeof doc.roundedRect === 'function') {
                doc.roundedRect(x, y, boxW, boxH, 1.2 * L.s, 1.2 * L.s);
            } else {
                doc.rect(x, y, boxW, boxH);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.tiny);
            doc.setTextColor(this.colors.subtle);
            doc.text(`M${m + 1}`, x + 2 * L.s, y + 3.4 * L.s);
            this._rule(doc, L, x + 7 * L.s, x + boxW - 2 * L.s, y + 3.4 * L.s);
            const innerRows = Math.max(0, Math.floor((boxH - 6 * L.s) / (4.2 * L.s)));
            for (let r = 1; r <= innerRows; r++) {
                this._rule(doc, L, x + 2 * L.s, x + boxW - 2 * L.s, y + 3.4 * L.s + r * 4.2 * L.s);
            }
        }
        this._footer(doc, L, 'Year at a Glance');
    }

    /** Optional illustration divider page for a module. */
    addIllustrationPage(doc, moduleName, image) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(this._paper);
        const F = this._fonts(L);
        this._kicker(doc, L, 'Module', L.centerX, L.h * 0.2, 'center');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.title);
        doc.setTextColor(this.colors.ink);
        doc.text(String(moduleName), L.centerX, L.h * 0.25, { align: 'center' });

        const boxW = L.contentW * 0.8;
        const boxH = L.contentH * 0.5;
        const x = L.centerX - boxW / 2;
        const y = L.h * 0.3;
        this._setStroke(doc, this.colors.line, 0.25 * L.s);
        doc.rect(x, y, boxW, boxH);
        try {
            const source = image || `/public/assets/module-images/${moduleName}.png`;
            doc.addImage(source, 'PNG', x + 2, y + 2, boxW - 4, boxH - 4);
        } catch {
            // No usable image source: leave an elegant empty frame.
        }
        this._footer(doc, L, String(moduleName));
    }

    /** Classic 5 mm bullet-journal dot grid across the whole content area. */
    addDottedGridPage(doc, dotSpacing = 5, paperDimensions) {
        if (!doc) throw new Error('Invalid document instance');
        if (!(dotSpacing > 0)) throw new Error('Invalid dot spacing');
        if (!paperDimensions && !this._paper) throw new Error('Invalid paper dimensions');
        if (arguments.length >= 3 && !paperDimensions) throw new Error('Invalid paper dimensions');

        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const spacing = dotSpacing < 1 ? dotSpacing * 25.4 : dotSpacing; // legacy inch input

        // Centre the grid inside the content area.
        const nx = Math.max(1, Math.floor(L.contentW / spacing) + 1);
        const ny = Math.max(1, Math.floor((L.contentH - 4 * L.s) / spacing) + 1);
        const x0 = L.margin + (L.contentW - (nx - 1) * spacing) / 2;
        const y0 = L.margin + (L.contentH - 4 * L.s - (ny - 1) * spacing) / 2;
        doc.setFillColor(this.colors.faint);
        for (let ix = 0; ix < nx; ix++) {
            for (let iy = 0; iy < ny; iy++) {
                doc.circle(x0 + ix * spacing, y0 + iy * spacing, 0.22 * L.s, 'F');
            }
        }
        this._footer(doc, L, this.title);
    }

    /** Daily plan: time blocks, priorities, to-dos and a notes band. */
    addDailyPlanningPage(doc, paperDimensions) {
        if (!paperDimensions && !this._paper) throw new Error('Invalid paper dimensions');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, 'One Day at a Time', 'Daily Plan');

        // Date fill-in, top right.
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.subtle);
        doc.text('date', L.right - 26 * L.s, L.margin + 7.5 * L.s, { align: 'right' });
        this._rule(doc, L, L.right - 24 * L.s, L.right, L.margin + 8.3 * L.s);

        const notesH = L.contentH * 0.2;
        const bodyBottom = L.bottom - notesH - 8 * L.s;
        const leftW = L.contentW * 0.56;
        const rightX = L.margin + leftW + 6 * L.s;

        // Left column — Morning / Afternoon / Evening.
        const blocks = ['Morning', 'Afternoon', 'Evening'];
        const blockH = (bodyBottom - top) / blocks.length;
        blocks.forEach((label, b) => {
            const by = top + b * blockH + 4 * L.s;
            this._kicker(doc, L, label, L.margin, by);
            const rows = Math.max(1, Math.floor((blockH - 6 * L.s) / L.rowH));
            for (let r = 1; r <= rows; r++) {
                this._rule(doc, L, L.margin, L.margin + leftW, by + r * L.rowH);
            }
        });

        // Right column — Priorities then To-Do.
        let ry = top + 4 * L.s;
        this._kicker(doc, L, 'Top Priorities', rightX, ry);
        for (let n = 0; n < 3; n++) {
            ry += L.rowH;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.faint);
            doc.text(String(n + 1), rightX, ry);
            this._checkboxRow(doc, L, rightX + 3.5 * L.s, L.right, ry);
        }
        ry += L.rowH * 1.4;
        this._kicker(doc, L, 'To-Do', rightX, ry);
        const todoRows = Math.max(1, Math.floor((bodyBottom - ry - 2 * L.s) / L.rowH));
        for (let n = 0; n < todoRows; n++) {
            ry += L.rowH;
            this._checkboxRow(doc, L, rightX, L.right, ry);
        }
        // Notes band with a fine dot grid.
        const notesTop = bodyBottom + 6 * L.s;
        this._kicker(doc, L, 'Notes', L.margin, notesTop);
        doc.setFillColor(this.colors.faint);
        const spacing = 5 * L.s;
        for (let x = L.margin + spacing / 2; x <= L.right; x += spacing) {
            for (let y = notesTop + 3 * L.s; y <= L.bottom - 2 * L.s; y += spacing) {
                doc.circle(x, y, 0.22 * L.s, 'F');
            }
        }
        this._footer(doc, L, 'Daily Plan');
    }

    /** Weekly overview: seven day panels plus a goals panel. */
    addWeeklyOverviewPage(doc, paperDimensions) {
        if (!paperDimensions) throw new Error('Invalid paper dimensions');
        this._newPage(doc);
        const L = this._layout(paperDimensions);
        const F = this._fonts(L);
        const top = this._header(doc, L, 'Seven Days', 'Weekly Overview');

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Goals & Habits'];
        const cols = 2;
        const rows = 4;
        const gap = 4 * L.s;
        const boxW = (L.contentW - gap) / cols;
        const boxH = (L.bottom - top - 4 * L.s - gap * (rows - 1)) / rows;
        days.forEach((label, d) => {
            const x = L.margin + (d % cols) * (boxW + gap);
            const y = top + 4 * L.s + Math.floor(d / cols) * (boxH + gap);
            const isGoals = d === 7;
            this._setStroke(doc, isGoals ? this.colors.accent : this.colors.line, 0.25 * L.s);
            if (typeof doc.roundedRect === 'function') {
                doc.roundedRect(x, y, boxW, boxH, 1.2 * L.s, 1.2 * L.s);
            } else {
                doc.rect(x, y, boxW, boxH);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(isGoals ? this.colors.accent : this.colors.ink);
            doc.text(label, x + 2.5 * L.s, y + 4 * L.s);
            this._rule(doc, L, x + 2.5 * L.s, x + boxW - 2.5 * L.s, y + 5.4 * L.s);
            const innerRows = Math.max(0, Math.floor((boxH - 8 * L.s) / (5 * L.s)));
            for (let r = 1; r <= innerRows; r++) {
                if (isGoals) {
                    this._checkboxRow(doc, L, x + 2.5 * L.s, x + boxW - 2.5 * L.s, y + 5.4 * L.s + r * 5 * L.s);
                } else {
                    this._rule(doc, L, x + 2.5 * L.s, x + boxW - 2.5 * L.s, y + 5.4 * L.s + r * 5 * L.s);
                }
            }
        });
        this._footer(doc, L, 'Weekly Overview');
    }

    /**
     * Habit tracker matrix plus goal setting.
     * opts.kicker replaces the small heading above the title; opts.monthLine
     * adds a "month of ____" fill-in for undated monthly use.
     */
    addFlexibleTrackingPage(doc, paperDimensions, opts = {}) {
        if (!paperDimensions) throw new Error('Invalid paper dimensions');
        this._newPage(doc);
        const L = this._layout(paperDimensions);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Small Steps, Every Day', 'Habit Tracker');
        if (opts.monthLine) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.subtle);
            doc.text('month of', L.right - 34 * L.s, L.margin + 7.5 * L.s, { align: 'right' });
            this._rule(doc, L, L.right - 32 * L.s, L.right, L.margin + 8.3 * L.s);
        }

        // Tracker matrix: habit rows × 31 day columns.
        const daysInRow = 31;
        const nameW = L.contentW * 0.26;
        const gridX = L.margin + nameW;
        const cellW = (L.right - gridX) / daysInRow;
        const habitRows = 8;
        const cellH = Math.min(Math.max(3, 7 * L.s), (L.contentH * 0.5) / habitRows);
        const gridTop = top + 6 * L.s;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.max(3.5, F.tiny * 0.85));
        doc.setTextColor(this.colors.subtle);
        const numberStep = cellW >= 2.4 ? 1 : 5;
        for (let d = 1; d <= daysInRow; d += 1) {
            if (d % numberStep === 0 || d === 1) {
                doc.text(String(d), gridX + (d - 0.5) * cellW, gridTop - 1.2 * L.s, { align: 'center' });
            }
        }
        this._setStroke(doc, this.colors.line, 0.18 * L.s);
        for (let r = 0; r <= habitRows; r++) {
            doc.line(L.margin, gridTop + r * cellH, L.right, gridTop + r * cellH);
        }
        for (let c = 0; c <= daysInRow; c++) {
            doc.line(gridX + c * cellW, gridTop, gridX + c * cellW, gridTop + habitRows * cellH);
        }
        doc.setFontSize(F.tiny);
        doc.text('habit', L.margin, gridTop - 1.2 * L.s);

        // Goal-setting checkboxes.
        let gy = gridTop + habitRows * cellH + 8 * L.s;
        this._kicker(doc, L, 'Goal-Setting', L.margin, gy);
        for (let n = 0; n < 4; n++) {
            gy += L.rowH;
            this._checkboxRow(doc, L, L.margin, L.right, gy);
        }

        // Free tracking space.
        gy += L.rowH * 1.4;
        this._kicker(doc, L, 'Flexible Tracking', L.margin, gy);
        const rows = Math.max(0, Math.floor((L.bottom - gy - 3 * L.s) / L.rowH));
        for (let r = 1; r <= rows; r++) {
            this._rule(doc, L, L.margin, L.right, gy + r * L.rowH);
        }
        this._footer(doc, L, 'Habit Tracker');
    }

    /* ------------------------------------------------------------------ *
     *  Printable pages for children and students                          *
     * ------------------------------------------------------------------ */

    /**
     * Cover for a themed edition, drawn on the CURRENT page in the same
     * style as addCoverPage, with a "This journal belongs to" line.
     * opts: { title, subtitle, kicker }.
     */
    addNameCoverPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const title = opts.title || this.title;

        const o = L.margin * 0.55;
        this._setStroke(doc, this.colors.accent, 0.5 * L.s);
        doc.rect(o, o, L.w - o * 2, L.h - o * 2);
        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        const i = o + 1.6 * L.s;
        doc.rect(i, i, L.w - i * 2, L.h - i * 2);

        if (opts.kicker !== '') {
            this._kicker(doc, L, opts.kicker || 'Printable Journal', L.centerX, L.h * 0.3, 'center');
        }
        this._setStroke(doc, this.colors.accent, 0.5 * L.s);
        doc.line(L.centerX - 11 * L.s, L.h * 0.33, L.centerX + 11 * L.s, L.h * 0.33);

        // Title, wrapped so a long one grows downwards instead of off the page.
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.display);
        doc.setTextColor(this.colors.ink);
        const titleLines = this._wrap(doc, title, L.contentW * 0.85);
        const titleStep = F.display * 0.3528 * 1.15;
        let y = L.h * 0.42;
        titleLines.forEach((line, n) => {
            doc.text(line, L.centerX, y + n * titleStep, { align: 'center' });
        });
        y += (titleLines.length - 1) * titleStep;

        if (opts.subtitle) {
            doc.setFont('times', 'italic');
            doc.setFontSize(F.heading);
            doc.setTextColor(this.colors.subtle);
            const subLines = this._wrap(doc, opts.subtitle, L.contentW * 0.8);
            const subStep = F.heading * 0.3528 * 1.35;
            y += 10 * L.s;
            subLines.forEach((line, n) => {
                doc.text(line, L.centerX, y + n * subStep, { align: 'center' });
            });
        }

        // Owner's name.
        const nameY = L.h * 0.68;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.body);
        doc.setTextColor(this.colors.ink);
        doc.text('This journal belongs to', L.centerX, nameY, { align: 'center' });
        const half = L.contentW * 0.32;
        if (this.owner) this._ownerName(doc, L, nameY + 7.5 * L.s, half * 2);
        this._rule(doc, L, L.centerX - half, L.centerX + half, nameY + 9 * L.s);

        doc.setFillColor(this.colors.accent);
        for (let d = -1; d <= 1; d++) {
            doc.circle(L.centerX + d * 4 * L.s, L.h * 0.84, 0.55 * L.s, 'F');
        }
        this._coverFooter(doc, L);
    }

    /**
     * A short numbered list of instructions on its own page.
     * opts: { kicker, title, items: string[] }.
     */
    addHowToUsePage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const items = Array.isArray(opts.items) ? opts.items.slice(0, 20) : [];
        let y = this._header(doc, L, opts.kicker || 'Start Here', opts.title || 'How to use this journal');

        const numberW = 7 * L.s;
        const textW = L.contentW - numberW;
        const lineStep = F.body * 0.3528 * 1.45;
        y += 4 * L.s;
        items.forEach((item, n) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.body);
            const lines = this._wrap(doc, item, textW);
            if (y + (lines.length - 1) * lineStep > L.bottom) return;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(this.colors.accent);
            doc.text(String(n + 1), L.margin, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(this.colors.ink);
            lines.forEach((line, k) => doc.text(line, L.margin + numberW, y + k * lineStep));
            y += lines.length * lineStep + 4 * L.s;
        });
        if (opts.rulingGuide) this._rulingGuide(doc, L, y + 6 * L.s);
        this._footer(doc, L, opts.footerLabel || 'How to use');
    }

    /** An enlarged four-line set with a note beside each part, starting at y. */
    _rulingGuide(doc, L, y) {
        const F = this._fonts(L);
        const band = this._defaultBand(L) * 1.5;
        if (y + 8 * L.s + band > L.bottom) return;
        this._kicker(doc, L, 'The four lines', L.margin, y);
        const y0 = y + 6 * L.s;
        const setRight = L.margin + L.contentW * 0.4;
        this._fourLineSet(doc, L, L.margin, setRight, y0, band);
        const step = band / 3;
        const notes = [
            { text: 'Tall letters and capitals reach line 1', y: y0 },
            { text: 'Small letters fill the shaded band and sit on line 3', y: y0 + step * 1.5 },
            { text: 'Tails of g, j, p, q and y reach line 4', y: y0 + band }
        ];
        const textX = setRight + 4 * L.s;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.ink);
        notes.forEach((note) => {
            doc.text(note.text, textX, note.y + F.small * 0.3528 * 0.35, { maxWidth: L.right - textX });
        });
    }

    /**
     * Four-line handwriting ruling as in Indian school copybooks. Each set
     * has four evenly spaced lines; small letters fill the shaded middle
     * band and sit on the third line, tall letters reach the first line and
     * tails reach the fourth.
     *
     * opts: { bandMm, rows, title, kicker }. bandMm is the height of one
     * four-line set; the default is 12 mm on A4 and scales gently with the
     * paper (children write at much the same size on any page).
     */
    addHandwritingPracticePage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        if (!paperDimensions && !this._paper) throw new Error('Invalid paper dimensions');
        const L = this._layout(paperDimensions || this._paper);
        const band = opts.bandMm === undefined ? this._defaultBand(L) : Number(opts.bandMm);
        if (!(band >= 4) || band > L.contentH / 2) throw new Error('Invalid band height');
        this._newPage(doc);

        const top = this._header(doc, L, opts.kicker || 'Handwriting', opts.title || 'Practice Page');

        // Name and date on one line under the header.
        const infoY = top + 1.5 * L.s;
        const split = L.margin + L.contentW * 0.62;
        this._fillIn(doc, L, 'name', L.margin, split - 4 * L.s, infoY);
        this._fillIn(doc, L, 'date', split, L.right, infoY);

        // Fit as many sets as the page allows, then share out the slack so
        // the last line lands on the bottom of the content area.
        const startY = infoY + 7 * L.s;
        const minGap = band * 0.6;
        const available = L.bottom - startY;
        const fit = Math.max(1, Math.floor((available + minGap) / (band + minGap)));
        const rows = opts.rows ? Math.max(1, Math.min(fit, Math.floor(opts.rows))) : fit;
        const gap = rows > 1 ? Math.min(band, (available - rows * band) / (rows - 1)) : 0;
        const marginX = L.margin + 9 * L.s;

        for (let r = 0; r < rows; r++) {
            this._fourLineSet(doc, L, L.margin, L.right, startY + r * (band + gap), band);
        }

        // Margin line down the left, as in a school exercise book.
        const lastY = startY + (rows - 1) * (band + gap) + band;
        this._setStroke(doc, this.colors.accent, 0.3 * L.s);
        doc.line(marginX, startY, marginX, lastY);

        this._footer(doc, L, opts.footerLabel || 'Handwriting Practice');
    }

    /** Default height of one four-line set: 12 mm on A4, 8 to 16 mm on other papers. */
    _defaultBand(L) {
        return Math.min(16, Math.max(8, 12 * Math.sqrt(L.s)));
    }

    /**
     * One four-line set from x1 to x2 with its top line at y0. Lines are
     * evenly spaced; the band between lines 2 and 3 is shaded, line 2 is
     * dashed and line 3, the writing line, is the darkest.
     */
    _fourLineSet(doc, L, x1, x2, y0, band) {
        const step = band / 3;
        doc.setFillColor(this.colors.faint);
        doc.rect(x1, y0 + step, x2 - x1, step, 'F');
        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        doc.line(x1, y0, x2, y0);
        doc.line(x1, y0 + band, x2, y0 + band);
        this._setStroke(doc, this.colors.subtle, 0.18 * L.s);
        if (typeof doc.setLineDashPattern === 'function') doc.setLineDashPattern([1.2 * L.s, 1 * L.s], 0);
        doc.line(x1, y0 + step, x2, y0 + step);
        if (typeof doc.setLineDashPattern === 'function') doc.setLineDashPattern([], 0);
        this._setStroke(doc, this.colors.subtle, 0.3 * L.s);
        doc.line(x1, y0 + step * 2, x2, y0 + step * 2);
    }

    /** Reading log: date, book, pages or minutes, and three stars to colour in. */
    addReadingLogPage(doc, paperDimensions) {
        if (!doc) throw new Error('Invalid document instance');
        if (!paperDimensions && !this._paper) throw new Error('Invalid paper dimensions');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, 'Books I Read', 'Reading Log');

        doc.setFont('times', 'italic');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.subtle);
        doc.text('Colour in the stars: one for hard, two for good, three for loved it.', L.margin, top + 1 * L.s, {
            maxWidth: L.contentW
        });

        const columns = [
            { label: 'Date', share: 0.15 },
            { label: 'Book title', share: 0.43 },
            { label: 'Pages or minutes', share: 0.19 },
            { label: 'How did it go?', share: 0.23 }
        ];
        const tableTop = top + 6 * L.s;
        const headH = Math.max(5, 8 * L.s);
        const rowH = Math.max(7, 10 * L.s);
        const rows = Math.max(1, Math.floor((L.bottom - tableTop - headH) / rowH));
        const tableBottom = tableTop + headH + rows * rowH;

        doc.setFillColor(this.colors.wash);
        doc.rect(L.margin, tableTop, L.contentW, headH, 'F');
        let x = L.margin;
        const edges = [x];
        columns.forEach((col) => {
            const w = L.contentW * col.share;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.ink);
            doc.text(col.label, x + 1.5 * L.s, tableTop + headH / 2 + 1.2 * L.f, { maxWidth: w - 3 * L.s });
            x += w;
            edges.push(x);
        });

        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        doc.line(L.margin, tableTop, L.right, tableTop);
        for (let r = 0; r <= rows; r++) {
            const y = tableTop + headH + r * rowH;
            doc.line(L.margin, y, L.right, y);
        }
        edges.forEach((ex) => doc.line(ex, tableTop, ex, tableBottom));

        // Three stars per row in the last column.
        const starCol = edges[3];
        const starW = edges[4] - starCol;
        const radius = Math.min(rowH * 0.3, starW / 8);
        for (let r = 0; r < rows; r++) {
            const cy = tableTop + headH + r * rowH + rowH / 2 + radius * 0.1;
            for (let k = 0; k < 3; k++) {
                this._star(doc, L, starCol + starW * (k + 1) / 4, cy, radius);
            }
        }
        this._footer(doc, L, 'Reading Log');
    }

    /**
     * One school week: a goal box, an exams box and Monday to Sunday rows
     * with subject, homework and a done checkbox. opts.week numbers the page.
     */
    addStudyPlannerPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        if (!paperDimensions && !this._paper) throw new Error('Invalid paper dimensions');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const kicker = opts.week ? `Week ${opts.week}` : 'One Week';
        const top = this._header(doc, L, kicker, 'Study Planner');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.subtle);
        doc.text('week of', L.right - 34 * L.s, L.margin + 7.5 * L.s, { align: 'right' });
        this._rule(doc, L, L.right - 32 * L.s, L.right, L.margin + 8.3 * L.s);

        // Goal and exams boxes side by side.
        const gap = 4 * L.s;
        const boxW = (L.contentW - gap) / 2;
        const boxH = Math.max(14, 26 * L.s);
        const boxTop = top + 1 * L.s;
        [
            { label: "This week's goal", color: this.colors.accent },
            { label: 'Exams and tests coming up', color: this.colors.line }
        ].forEach((box, b) => {
            const bx = L.margin + b * (boxW + gap);
            this._box(doc, L, bx, boxTop, boxW, boxH, box.color);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(b === 0 ? this.colors.accent : this.colors.ink);
            doc.text(box.label, bx + 2.5 * L.s, boxTop + 4.5 * L.s, { maxWidth: boxW - 5 * L.s });
            const lines = Math.max(1, Math.floor((boxH - 8 * L.s) / (6 * L.s)));
            for (let r = 1; r <= lines; r++) {
                this._rule(doc, L, bx + 2.5 * L.s, bx + boxW - 2.5 * L.s, boxTop + 5.5 * L.s + r * 6 * L.s);
            }
        });

        // Week table.
        const columns = [
            { label: 'Day', share: 0.17 },
            { label: 'Subject', share: 0.24 },
            { label: 'Homework or topic', share: 0.47 },
            { label: 'Done', share: 0.12 }
        ];
        const tableTop = boxTop + boxH + 5 * L.s;
        const headH = Math.max(5, 7 * L.s);
        const dayH = (L.bottom - tableTop - headH) / 7;
        const subRows = Math.max(1, Math.min(4, Math.floor(dayH / Math.max(5, 7 * L.s))));
        const subH = dayH / subRows;

        doc.setFillColor(this.colors.wash);
        doc.rect(L.margin, tableTop, L.contentW, headH, 'F');
        let x = L.margin;
        const edges = [x];
        columns.forEach((col, c) => {
            const w = L.contentW * col.share;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.ink);
            const tx = c === 3 ? x + w / 2 : x + 1.5 * L.s;
            doc.text(col.label, tx, tableTop + headH / 2 + 1.2 * L.f, c === 3 ? { align: 'center' } : { maxWidth: w - 3 * L.s });
            x += w;
            edges.push(x);
        });

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const bodyTop = tableTop + headH;
        days.forEach((day, d) => {
            const dy = bodyTop + d * dayH;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.ink);
            doc.text(day, L.margin + 1.5 * L.s, dy + Math.min(subH, dayH) / 2 + 1.2 * L.f);
            for (let r = 0; r < subRows; r++) {
                const ry = dy + r * subH;
                if (r > 0) this._rule(doc, L, edges[1], L.right, ry);
                this._setStroke(doc, this.colors.subtle, 0.25 * L.s);
                const boxEdge = Math.min(L.box * 1.2, subH * 0.6);
                doc.rect(edges[3] + (edges[4] - edges[3] - boxEdge) / 2, ry + (subH - boxEdge) / 2, boxEdge, boxEdge);
            }
        });

        this._setStroke(doc, this.colors.line, 0.25 * L.s);
        doc.line(L.margin, tableTop, L.right, tableTop);
        for (let d = 0; d <= 7; d++) {
            doc.line(L.margin, bodyTop + d * dayH, L.right, bodyTop + d * dayH);
        }
        edges.forEach((ex) => doc.line(ex, tableTop, ex, bodyTop + 7 * dayH));
        this._footer(doc, L, 'Study Planner');
    }

    /**
     * Thirty-day practice tracker: 5 rows of 6 day boxes with a checkbox,
     * plus "Letters I find hard" and "Letters I improved".
     * opts: { title, kicker }.
     */
    addPracticeTrackerPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        if (!paperDimensions && !this._paper) throw new Error('Invalid paper dimensions');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || '30 Days', opts.title || 'Practice Tracker');

        doc.setFont('times', 'italic');
        doc.setFontSize(F.body);
        doc.setTextColor(this.colors.subtle);
        doc.text('I practised my handwriting today. Tick a box after each practice.', L.margin, top + 1 * L.s, {
            maxWidth: L.contentW
        });

        const cols = 6;
        const rows = 5;
        const gap = 2.5 * L.s;
        const gridTop = top + 7 * L.s;
        const cellW = (L.contentW - gap * (cols - 1)) / cols;
        const lettersH = Math.max(30, L.contentH * 0.27);
        const gridH = L.bottom - gridTop - lettersH - 8 * L.s;
        const cellH = Math.min(cellW, (gridH - gap * (rows - 1)) / rows);
        const edge = Math.min(cellW, cellH) * 0.42;

        for (let n = 0; n < cols * rows; n++) {
            const cx = L.margin + (n % cols) * (cellW + gap);
            const cy = gridTop + Math.floor(n / cols) * (cellH + gap);
            this._box(doc, L, cx, cy, cellW, cellH, this.colors.line);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.subtle);
            doc.text(String(n + 1), cx + 1.6 * L.s, cy + 1.6 * L.s + F.small * 0.3528 * 0.75);
            this._setStroke(doc, this.colors.accent, 0.3 * L.s);
            doc.rect(cx + (cellW - edge) / 2, cy + cellH - edge - (cellH - edge) * 0.3, edge, edge);
        }

        const boxesTop = gridTop + rows * cellH + (rows - 1) * gap + 8 * L.s;
        const boxH = L.bottom - boxesTop;
        const boxGap = 4 * L.s;
        const boxW = (L.contentW - boxGap) / 2;
        ['Letters I find hard', 'Letters I improved'].forEach((label, b) => {
            const bx = L.margin + b * (boxW + boxGap);
            this._box(doc, L, bx, boxesTop, boxW, boxH, b === 0 ? this.colors.line : this.colors.accent);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(b === 0 ? this.colors.ink : this.colors.accent);
            doc.text(label, bx + 2.5 * L.s, boxesTop + 4.5 * L.s, { maxWidth: boxW - 5 * L.s });
            const lines = Math.max(1, Math.floor((boxH - 8 * L.s) / (7 * L.s)));
            for (let r = 1; r <= lines; r++) {
                this._rule(doc, L, bx + 2.5 * L.s, bx + boxW - 2.5 * L.s, boxesTop + 5.5 * L.s + r * 7 * L.s);
            }
        });
        this._footer(doc, L, 'Practice Tracker');
    }

    /* ------------------------------------------------------------------ *
     *  Book assembly                                                      *
     * ------------------------------------------------------------------ */

    getExpectedPageCount() {
        const coverPageCount = 1;
        const indexPageCount = 1;
        const futureLogPages = 1 + MONTHS; // intro + one page per month
        const milestonesPages = 2;
        const helicopterPageCount = 1;
        const monthlyPages = MONTHS * MONTH_SECTION_PAGES;
        return coverPageCount + indexPageCount + futureLogPages + milestonesPages + helicopterPageCount + monthlyPages;
    }

    /** Creates a jsPDF document with the correct physical page size. */
    createDocument(paperSize) {
        const paperDimensions = PAPER_SIZES[paperSize];
        if (!paperDimensions) throw new Error('Unsupported paper size');
        return new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [paperDimensions.width, paperDimensions.height],
            compress: true
        });
    }

    /**
     * Builds the full journal and returns the jsPDF document without
     * saving, which makes the library usable from Node services
     * (`doc.output('arraybuffer')`) as well as the browser.
     */
    generate(paperSize, doc = null) {
        const paperDimensions = PAPER_SIZES[paperSize];
        if (!paperDimensions) throw new Error('Unsupported paper size');
        this._paper = paperDimensions;
        this._pageNo = 1;
        const target = doc || this.createDocument(paperSize);

        this.applyColors(target);

        // Static sections.
        this.addCoverPage(target, paperDimensions);
        this.addIndexPage(target, paperDimensions);
        this.addUndatedCalendarPages(target, paperDimensions);
        this.addTopMilestonesPage(target, paperDimensions);
        this.addHelicopterOverviewPage(target, paperDimensions);

        // Monthly repeating sections.
        for (let i = 0; i < MONTHS; i++) {
            this.addDottedGridPage(target, 5, paperDimensions);
            this.addDailyPlanningPage(target, paperDimensions);
            this.addWeeklyOverviewPage(target, paperDimensions);
            this.addFlexibleTrackingPage(target, paperDimensions);
        }
        return target;
    }

    /** Generates the journal and saves it (browser download / file). */
    createBulletJournalBook(paperSize, doc = null) {
        const target = this.generate(paperSize, doc);
        const filename = `${this.title.replace(/\s+/g, '_').toLowerCase()}_journal_book.pdf`;
        target.save(filename);
        return target;
    }
}

export { BulletJournal, PAPER_SIZES, fitsStandardFonts, MAX_OWNER_CHARS };
export { EDITIONS, buildEdition, EDITION_PAPERS } from './editions.js';
