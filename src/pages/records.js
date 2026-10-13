/**
 * Record-keeping pages for professional journals: ruled tables, registers,
 * a timetable, a weekly lesson plan, notes on each child, case notes, a
 * section divider and a page of prompted notes. The teacher's planner and
 * the advocate's case diary are built from these.
 *
 * bujo.js installs these on BulletJournal.prototype; `this` is the journal.
 */

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const recordPages = {
    /** "label ____" fill-in at the top right of a page, beside the header. */
    _headerFillIn(doc, L, label) {
        const F = this._fonts(L);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.subtle);
        doc.text(label, L.right - 34 * L.s, L.margin + 7.5 * L.s, { align: 'right' });
        this._rule(doc, L, L.right - 32 * L.s, L.right, L.margin + 8.3 * L.s);
    },

    /**
     * Header row of a table: a shaded band with the column labels. Returns
     * the x of every column edge, left to right.
     */
    _tableHead(doc, L, top, columns, headH) {
        const F = this._fonts(L);
        doc.setFillColor(this.colors.wash);
        doc.rect(L.margin, top, L.contentW, headH, 'F');
        let x = L.margin;
        const edges = [x];
        columns.forEach((col) => {
            const w = L.contentW * col.share;
            if (col.label) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(F.small);
                doc.setTextColor(this.colors.ink);
                const lines = this._wrap(doc, col.label, w - 3 * L.s).slice(0, 2);
                const step = F.small * 0.3528 * 1.15;
                const y0 = top + headH / 2 + 1.2 * L.f - ((lines.length - 1) * step) / 2;
                lines.forEach((line, k) => doc.text(line, x + 1.5 * L.s, y0 + k * step));
            }
            x += w;
            edges.push(x);
        });
        return edges;
    },

    /**
     * A ruled table filling the page, for logs: hearings, meetings, a case
     * index. opts: { kicker, title, columns: [{ label, share }], fillIn,
     * rowMm, footerLabel }. Shares add up to 1.
     */
    addTablePage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const title = opts.title || 'Log';
        const top = this._header(doc, L, opts.kicker || 'Record', title);
        if (opts.fillIn) this._headerFillIn(doc, L, opts.fillIn);

        const columns = opts.columns && opts.columns.length ? opts.columns : [{ label: '', share: 1 }];
        const tableTop = top + 1 * L.s;
        const headH = Math.max(6, 10 * L.s);
        const rowH = Math.max(5, (opts.rowMm || 10) * L.s);
        const rows = Math.max(1, Math.floor((L.bottom - tableTop - headH) / rowH));
        const tableBottom = tableTop + headH + rows * rowH;
        const edges = this._tableHead(doc, L, tableTop, columns, headH);

        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        doc.line(L.margin, tableTop, L.right, tableTop);
        for (let r = 0; r <= rows; r++) {
            const y = tableTop + headH + r * rowH;
            doc.line(L.margin, y, L.right, y);
        }
        edges.forEach((ex) => doc.line(ex, tableTop, ex, tableBottom));
        this._footer(doc, L, opts.footerLabel || title);
    },

    /**
     * A register: number, name and a grid of narrow columns, for
     * attendance (31 days, numbered) or marks (blank headings to write the
     * test names in, a "max marks" row and a total).
     * opts: { kicker, title, columns, numbered, subHead, total, rows, fillIn }.
     */
    addRegisterPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const title = opts.title || 'Register';
        const top = this._header(doc, L, opts.kicker || 'Class', title);
        if (opts.fillIn) this._headerFillIn(doc, L, opts.fillIn);

        const count = Math.max(1, Math.min(31, opts.columns || 31));
        const noW = 7 * L.s;
        const nameW = L.contentW * 0.28;
        const totalW = opts.total ? 11 * L.s : 0;
        const gridX = L.margin + noW + nameW;
        const cellW = (L.right - totalW - gridX) / count;
        const headH = opts.numbered ? Math.max(4, 6 * L.s) : Math.max(8, 14 * L.s);
        const subH = opts.subHead ? Math.max(4, 6 * L.s) : 0;
        const tableTop = top + 1 * L.s;
        const bodyTop = tableTop + headH + subH;
        const minRow = Math.max(3.4, 5 * L.s);
        const rows = Math.max(1, Math.min(opts.rows || 40, Math.floor((L.bottom - bodyTop) / minRow)));
        const rowH = Math.min(9 * L.s, (L.bottom - bodyTop) / rows);
        const bottom = bodyTop + rows * rowH;

        doc.setFillColor(this.colors.wash);
        doc.rect(L.margin, tableTop, L.contentW, headH + subH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.ink);
        const headY = tableTop + headH / 2 + 1.2 * L.f;
        doc.text('No.', L.margin + 1 * L.s, headY);
        doc.text(opts.nameLabel || 'Name', L.margin + noW + 1.5 * L.s, headY);
        if (opts.total) doc.text('Total', L.right - totalW / 2, headY, { align: 'center' });
        if (opts.numbered) {
            doc.setFontSize(Math.max(3.5, F.tiny * 0.85));
            doc.setTextColor(this.colors.subtle);
            for (let d = 1; d <= count; d++) {
                doc.text(String(d), gridX + (d - 0.5) * cellW, headY, { align: 'center' });
            }
        }
        if (opts.subHead) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.tiny);
            doc.setTextColor(this.colors.subtle);
            doc.text(opts.subHead, gridX - 1.5 * L.s, tableTop + headH + subH / 2 + 1 * L.f, { align: 'right' });
        }

        // Row numbers, faint, so a class list keeps its order across pages.
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.max(3.5, Math.min(F.tiny, rowH * 0.55 / 0.3528)));
        doc.setTextColor(this.colors.faint);
        for (let r = 0; r < rows; r++) {
            doc.text(String(r + 1), L.margin + noW - 1.5 * L.s, bodyTop + r * rowH + rowH * 0.68, { align: 'right' });
        }

        this._setStroke(doc, this.colors.line, 0.18 * L.s);
        [tableTop, tableTop + headH, ...(subH ? [bodyTop] : [])].forEach((y) => doc.line(L.margin, y, L.right, y));
        for (let r = 1; r <= rows; r++) doc.line(L.margin, bodyTop + r * rowH, L.right, bodyTop + r * rowH);
        const verticals = [L.margin, L.margin + noW, gridX, L.right];
        for (let c = 1; c <= count; c++) verticals.push(gridX + c * cellW);
        verticals.forEach((x) => doc.line(x, tableTop, x, bottom));
        this._footer(doc, L, opts.footerLabel || title);
    },

    /** A week of periods, Monday to Saturday, with times along the top and duties below. */
    addTimetablePage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Every Week', opts.title || 'Timetable');

        const periods = Math.max(1, Math.min(10, opts.periods || 8));
        const dayW = L.contentW * 0.14;
        const cellW = (L.contentW - dayW) / periods;
        const headH = Math.max(4, 6 * L.s);
        const tableTop = top + 1 * L.s;
        const bodyTop = tableTop + headH * 2;
        const dayH = (L.contentH * 0.62) / WEEKDAYS.length;
        const bottom = bodyTop + dayH * WEEKDAYS.length;

        doc.setFillColor(this.colors.wash);
        doc.rect(L.margin, tableTop, L.contentW, headH * 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.ink);
        doc.text('Period', L.margin + 1.5 * L.s, tableTop + headH / 2 + 1.2 * L.f);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(this.colors.subtle);
        doc.text('Time', L.margin + 1.5 * L.s, tableTop + headH * 1.5 + 1.2 * L.f);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(this.colors.ink);
        for (let p = 1; p <= periods; p++) {
            doc.text(String(p), L.margin + dayW + (p - 0.5) * cellW, tableTop + headH / 2 + 1.2 * L.f, { align: 'center' });
        }
        WEEKDAYS.forEach((day, d) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.ink);
            doc.text(day.slice(0, 3), L.margin + 1.5 * L.s, bodyTop + d * dayH + 4 * L.s);
        });

        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        [tableTop, tableTop + headH, bodyTop].forEach((y) => doc.line(L.margin, y, L.right, y));
        for (let d = 1; d <= WEEKDAYS.length; d++) doc.line(L.margin, bodyTop + d * dayH, L.right, bodyTop + d * dayH);
        doc.line(L.margin, tableTop, L.margin, bottom);
        doc.line(L.margin + dayW, tableTop, L.margin + dayW, bottom);
        for (let p = 1; p <= periods; p++) doc.line(L.margin + dayW + p * cellW, tableTop, L.margin + dayW + p * cellW, bottom);

        let y = bottom + 8 * L.s;
        this._kicker(doc, L, opts.notesLabel || 'Duties, clubs and reminders', L.margin, y);
        this._rules(doc, L, L.margin, L.right, y, Math.max(0, Math.floor((L.bottom - y) / L.rowH)));
        this._footer(doc, L, opts.footerLabel || 'Timetable');
    },

    /**
     * One teaching week: a focus box, a resources box, then Monday to
     * Saturday with class, topic and activity, homework and a done box.
     * opts.week numbers the page.
     */
    addLessonPlanPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.week ? `Week ${opts.week}` : 'One Week', opts.title || 'Lesson Plan');
        this._headerFillIn(doc, L, 'week of');

        const gap = 4 * L.s;
        const boxW = (L.contentW - gap) / 2;
        const boxH = Math.max(14, 22 * L.s);
        const boxTop = top + 1 * L.s;
        [
            { label: 'This week\'s focus', color: this.colors.accent },
            { label: 'Resources and reminders', color: this.colors.line }
        ].forEach((box, b) => {
            const bx = L.margin + b * (boxW + gap);
            this._box(doc, L, bx, boxTop, boxW, boxH, box.color);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(b === 0 ? this.colors.accent : this.colors.ink);
            doc.text(box.label, bx + 2.5 * L.s, boxTop + 4.5 * L.s, { maxWidth: boxW - 5 * L.s });
            this._rules(doc, L, bx + 2.5 * L.s, bx + boxW - 2.5 * L.s, boxTop + 5.5 * L.s, Math.max(1, Math.floor((boxH - 8 * L.s) / (6 * L.s))), 6 * L.s);
        });

        const columns = [
            { label: 'Day', share: 0.13 },
            { label: 'Class and subject', share: 0.2 },
            { label: 'Topic and activity', share: 0.38 },
            { label: 'Homework', share: 0.21 },
            { label: 'Done', share: 0.08 }
        ];
        const tableTop = boxTop + boxH + 5 * L.s;
        const headH = Math.max(5, 7 * L.s);
        const dayH = (L.bottom - tableTop - headH) / WEEKDAYS.length;
        const subRows = Math.max(1, Math.min(4, Math.floor(dayH / Math.max(5, 7 * L.s))));
        const subH = dayH / subRows;
        const edges = this._tableHead(doc, L, tableTop, columns, headH);
        const bodyTop = tableTop + headH;

        WEEKDAYS.forEach((day, d) => {
            const dy = bodyTop + d * dayH;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.ink);
            doc.text(day.slice(0, 3), L.margin + 1.5 * L.s, dy + Math.min(subH, dayH) / 2 + 1.2 * L.f);
            for (let r = 0; r < subRows; r++) {
                const ry = dy + r * subH;
                if (r > 0) this._rule(doc, L, edges[1], L.right, ry);
                this._setStroke(doc, this.colors.subtle, 0.25 * L.s);
                const boxEdge = Math.min(L.box * 1.2, subH * 0.6);
                doc.rect(edges[4] + (edges[5] - edges[4] - boxEdge) / 2, ry + (subH - boxEdge) / 2, boxEdge, boxEdge);
            }
        });
        this._setStroke(doc, this.colors.line, 0.25 * L.s);
        doc.line(L.margin, tableTop, L.right, tableTop);
        for (let d = 0; d <= WEEKDAYS.length; d++) doc.line(L.margin, bodyTop + d * dayH, L.right, bodyTop + d * dayH);
        edges.forEach((ex) => doc.line(ex, tableTop, ex, bodyTop + WEEKDAYS.length * dayH));
        this._footer(doc, L, opts.footerLabel || 'Lesson Plan');
    },

    /** Cards for a few children each: doing well, needs help with, reading and writing, next step. */
    addStudentNotesPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Every Child', opts.title || 'Notes on Each Child');

        const cards = Math.max(1, Math.min(6, opts.cards || 4));
        const gap = 4 * L.s;
        const cardH = (L.bottom - top - 1 * L.s - gap * (cards - 1)) / cards;
        const labels = opts.labels || ['Doing well', 'Needs help with', 'Reading and writing', 'Next step'];
        const pad = 2.5 * L.s;
        for (let c = 0; c < cards; c++) {
            const y0 = top + 1 * L.s + c * (cardH + gap);
            this._box(doc, L, L.margin, y0, L.contentW, cardH, this.colors.line);
            const x1 = L.margin + pad;
            const x2 = L.right - pad;
            const split = L.margin + L.contentW * 0.62;
            const lineStep = (cardH - pad * 2) / (labels.length + 2);
            let y = y0 + pad + lineStep * 0.8;
            this._fillIn(doc, L, 'Name', x1, split - 3 * L.s, y);
            this._fillIn(doc, L, 'Class', split, x2, y);
            const labelW = L.contentW * 0.24;
            labels.forEach((label) => {
                y += lineStep;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(F.tiny);
                doc.setTextColor(this.colors.subtle);
                doc.text(label, x1, y);
                this._rule(doc, L, x1 + labelW, x2, y + 0.8 * L.s);
            });
            y += lineStep;
            this._setStroke(doc, this.colors.subtle, 0.25 * L.s);
            doc.rect(x1, y - L.box, L.box, L.box);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.subtle);
            doc.text(opts.checkLabel || 'Parent told', x1 + L.box + 1.5 * L.s, y);
            this._fillIn(doc, L, 'date', split, x2, y);
        }
        this._footer(doc, L, opts.footerLabel || 'Notes on Each Child');
    },

    /**
     * One matter on one page: case details, the facts, points to argue,
     * documents and pages to cite, and what to do before the next date.
     */
    addCaseNotePage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Case Notes', opts.title || 'Case Note');

        const step = 8.5 * L.s;
        const split = L.margin + L.contentW * 0.52;
        let y = top + 1 * L.s;
        [['Case number', 'Court and hall'], ['Client', 'Opposite party'], ['Filed on', 'Next hearing']].forEach(([left, right]) => {
            y += step * 0.85;
            this._fillIn(doc, L, left, L.margin, split - 4 * L.s, y);
            this._fillIn(doc, L, right, split, L.right, y);
        });

        y += step * 1.2;
        this._kicker(doc, L, 'Facts in brief', L.margin, y);
        y = this._rules(doc, L, L.margin, L.right, y + 0.5 * L.s, 4) + 6 * L.s;

        this._kicker(doc, L, 'Points to argue', L.margin, y);
        for (let n = 1; n <= 4; n++) {
            const ry = y + 0.5 * L.s + n * L.rowH;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.faint);
            doc.text(String(n), L.margin, ry - 0.8 * L.s);
            this._rule(doc, L, L.margin + 5 * L.s, L.right, ry);
        }
        y += 0.5 * L.s + 4 * L.rowH + 6 * L.s;

        this._kicker(doc, L, 'Documents and pages to cite', L.margin, y);
        const headH = Math.max(5, 7 * L.s);
        const tableTop = y + 2.5 * L.s;
        const columns = [
            { label: 'Document', share: 0.45 },
            { label: 'Page', share: 0.13 },
            { label: 'Why it matters', share: 0.42 }
        ];
        const edges = this._tableHead(doc, L, tableTop, columns, headH);
        const rowH = L.rowH;
        const tableBottom = tableTop + headH + 4 * rowH;
        this._setStroke(doc, this.colors.line, 0.2 * L.s);
        doc.line(L.margin, tableTop, L.right, tableTop);
        for (let r = 0; r <= 4; r++) doc.line(L.margin, tableTop + headH + r * rowH, L.right, tableTop + headH + r * rowH);
        edges.forEach((ex) => doc.line(ex, tableTop, ex, tableBottom));
        y = tableBottom + 8 * L.s;

        if (y + L.rowH <= L.bottom) {
            this._kicker(doc, L, 'To do before the next date', L.margin, y);
            const rows = Math.max(0, Math.floor((L.bottom - y - 1 * L.s) / L.rowH));
            for (let n = 1; n <= rows; n++) this._checkboxRow(doc, L, L.margin, L.right, y + n * L.rowH);
        }
        this._footer(doc, L, opts.footerLabel || 'Case Notes');
    },

    /** A divider opening a section: a large picture, the section name and one line about it. */
    addSectionPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const hasPicture = this._hasPicture(opts.picture);
        if (hasPicture) this._picture(doc, opts.picture, L.margin + L.contentW * 0.1, L.h * 0.14, L.contentW * 0.8, L.h * 0.44);

        let y = L.h * (hasPicture ? 0.66 : 0.4);
        if (opts.kicker) this._kicker(doc, L, opts.kicker, L.centerX, y, 'center');
        this._setStroke(doc, this.colors.accent, 0.5 * L.s);
        doc.line(L.centerX - 11 * L.s, y + 3 * L.s, L.centerX + 11 * L.s, y + 3 * L.s);
        y += 13 * L.s;
        const title = opts.title || 'Section';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.title * 1.5);
        doc.setTextColor(this.colors.ink);
        doc.text(title, L.centerX, y, { align: 'center', maxWidth: L.contentW });
        if (opts.text) {
            doc.setFont('times', 'italic');
            doc.setFontSize(F.heading);
            doc.setTextColor(this.colors.subtle);
            const lines = this._wrap(doc, opts.text, L.contentW * 0.8);
            const step = F.heading * 0.3528 * 1.35;
            lines.forEach((line, n) => doc.text(line, L.centerX, y + 9 * L.s + n * step, { align: 'center' }));
        }
        this._footer(doc, L, opts.footerLabel || title);
    },

    /** Prompts with writing lines, sharing the page between them. */
    addNotesPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const title = opts.title || 'Notes';
        const top = this._header(doc, L, opts.kicker || 'Notes', title);
        const prompts = opts.prompts && opts.prompts.length ? opts.prompts : [''];
        const share = (L.bottom - top - 2 * L.s) / prompts.length;
        prompts.forEach((prompt, n) => {
            const y0 = top + 2 * L.s + n * share;
            if (prompt) this._kicker(doc, L, prompt, L.margin, y0 + 2 * L.s);
            this._rules(doc, L, L.margin, L.right, y0 + 2.5 * L.s, Math.max(1, Math.floor((share - 6 * L.s) / L.rowH)));
        });
        this._footer(doc, L, opts.footerLabel || title);
    }
};

export { recordPages };
