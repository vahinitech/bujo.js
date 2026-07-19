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
    constructor(title = 'My Bullet Journal', colorScheme = 'color') {
        this.title = title;
        this.colorScheme = colorScheme;
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
        if (typeof doc.setCharSpace === 'function') doc.setCharSpace(0.6 * L.f);
        doc.text(String(text).toUpperCase(), x, y, { align });
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
        doc.text(String(label || this.title).toUpperCase(), L.margin, y);
        if (this._pageNo > 0) {
            doc.text(String(this._pageNo), L.right, y, { align: 'right' });
        }
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

    /** Habit tracker matrix plus goal setting. */
    addFlexibleTrackingPage(doc, paperDimensions) {
        if (!paperDimensions) throw new Error('Invalid paper dimensions');
        this._newPage(doc);
        const L = this._layout(paperDimensions);
        const F = this._fonts(L);
        const top = this._header(doc, L, 'Small Steps, Every Day', 'Habit Tracker');

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

export { BulletJournal, PAPER_SIZES };
