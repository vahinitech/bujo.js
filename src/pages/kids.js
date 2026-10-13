/**
 * Activity pages for the children's journal: about me, a phone number to
 * learn, the way home, experiments, ideas, tricks, drawing and colour
 * mixing. Every page asks the child to write something, so each one is
 * handwriting practice as well.
 *
 * bujo.js installs these on BulletJournal.prototype; `this` is the journal.
 * Each page takes an optional `opts.picture` (an id from the `art` option)
 * and lays out the same writing space without it.
 */

const PHONE_DIGITS = 10;

const kidsPages = {
    /**
     * Picture in the top right corner, level with the page header.
     * Returns { x, bottom } of the space it takes, or null without one.
     */
    _cornerPicture(doc, L, id, share = 0.3, heightMm = 36) {
        if (!this._hasPicture(id)) return null;
        const w = L.contentW * share;
        const x = L.right - w;
        const h = heightMm * L.s;
        this._picture(doc, id, x, L.margin, w, h);
        return { x: x - 4 * L.s, bottom: L.margin + h + 2 * L.s };
    },

    /** Small italic line in the page's quiet colour. Returns the next y. */
    _note(doc, L, text, x, y, width) {
        const F = this._fonts(L);
        return this._paragraph(doc, L, text, x, y, width, { font: 'times', style: 'italic', size: F.body, color: this.colors.subtle });
    },

    /** As many four-line sets as fit between y and the bottom, at most `max`. Returns the next y. */
    _writingSets(doc, L, y, max = 99, x1 = L.margin, x2 = L.right) {
        const band = this._defaultBand(L);
        const gap = band * 0.6;
        const fit = Math.max(0, Math.floor((L.bottom - y + gap) / (band + gap)));
        const sets = Math.min(max, fit);
        for (let r = 0; r < sets; r++) this._fourLineSet(doc, L, x1, x2, y + r * (band + gap), band);
        return sets ? y + sets * (band + gap) : y;
    },

    /** Name, school and home details, and what to do if lost. */
    addAboutMePage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Me and My Home', opts.title || 'All About Me');
        const corner = this._cornerPicture(doc, L, opts.picture);
        const colRight = corner ? corner.x : L.right;
        const step = 9 * L.s;

        let y = this._note(doc, L, 'Fill this in with a grown-up, then learn it by heart.', L.margin, top + 1 * L.s, colRight - L.margin);
        ['My name', 'My class', 'My school'].forEach((label) => {
            y += step * 0.85;
            this._fillIn(doc, L, label, L.margin, colRight, y);
        });
        y = Math.max(y, corner ? corner.bottom - step * 0.5 : y);

        y += step;
        this._fillIn(doc, L, 'My home address', L.margin, L.right, y);
        y = this._rules(doc, L, L.margin, L.right, y + 0.8 * L.s, 2, step);
        y += step;
        this._fillIn(doc, L, 'A landmark near my home', L.margin, L.right, y);

        // Two grown-ups and their numbers, one digit to a box.
        const edge = Math.min(7.5 * L.s, (L.contentW * 0.6) / PHONE_DIGITS);
        [['A parent\'s name', 'Their phone number'], ['Another grown-up I can call', 'Their phone number']].forEach(([who, number]) => {
            y += step;
            this._fillIn(doc, L, who, L.margin, L.right, y);
            y += 3 * L.s;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.subtle);
            doc.text(number, L.margin, y + edge * 0.65);
            this._digitBoxes(doc, L, L.right - edge * PHONE_DIGITS, y, PHONE_DIGITS, edge);
            y += edge;
        });

        // What to do if lost, in an accent box.
        y += 6 * L.s;
        const tipX = L.margin + 4 * L.s + 5 * L.s;
        const tipW = L.right - 3 * L.s - tipX;
        const lineStep = F.body * 0.3528 * 1.35;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.body);
        const tipLines = (opts.lostTips || []).map((tip) => this._wrap(doc, tip, tipW));
        const boxH = 9 * L.s + tipLines.reduce((sum, lines) => sum + lines.length * lineStep + 1.5 * L.s, 0);
        if (tipLines.length && y + boxH <= L.bottom) {
            this._box(doc, L, L.margin, y, L.contentW, boxH, this.colors.accent);
            this._kicker(doc, L, 'If I get lost', L.margin + 4 * L.s, y + 5.5 * L.s);
            let ty = y + 11 * L.s;
            tipLines.forEach((lines, n) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(F.body);
                doc.setTextColor(this.colors.accent);
                doc.text(String(n + 1), L.margin + 4 * L.s, ty);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(this.colors.ink);
                lines.forEach((line, k) => doc.text(line, tipX, ty + k * lineStep));
                ty += lines.length * lineStep + 1.5 * L.s;
            });
            y += boxH;
        }

        // Writing the address from memory is the handwriting practice here.
        if (y + 14 * L.s + this._defaultBand(L) <= L.bottom) {
            y += 8 * L.s;
            this._kicker(doc, L, 'Now write your address without looking', L.margin, y);
            this._writingSets(doc, L, y + 4 * L.s, 3);
        }
        this._footer(doc, L, opts.footerLabel || 'All About Me');
    },

    /** A phone number written from memory, day after day, one digit to a box. */
    addNumberMemoryPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Remember It', opts.title || 'My Family\'s Phone Number');
        const corner = this._cornerPicture(doc, L, opts.picture, 0.28);
        const colRight = corner ? corner.x : L.right;

        let y = this._note(
            doc,
            L,
            'Ask a grown-up to write the number in the top row. Each day, cover it, write it from memory, then check. Tick the last box when every digit is right.',
            L.margin,
            top + 1 * L.s,
            colRight - L.margin
        );
        y = Math.max(y, corner ? corner.bottom : y) + 3 * L.s;

        doc.setFont('helvetica', 'bold');
        const labelW = this._textWidth(doc, 'The number', F.small) + 3 * L.s;
        const gap = 3 * L.s;
        const edge = Math.min(9 * L.s, (L.contentW - labelW - gap * 2) / (PHONE_DIGITS + 1));
        const boxesX = L.margin + labelW;
        const tickX = L.right - edge;
        const label = (text, rowY, color, style) => {
            doc.setFont('helvetica', style);
            doc.setFontSize(F.small);
            doc.setTextColor(color);
            doc.text(text, L.margin, rowY + edge * 0.65);
        };

        label('The number', y, this.colors.accent, 'bold');
        this._digitBoxes(doc, L, boxesX, y, PHONE_DIGITS, edge, this.colors.accent);
        y += edge + 5 * L.s;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.tiny);
        doc.setTextColor(this.colors.subtle);
        doc.text('Right?', tickX + edge / 2, y - 1.2 * L.s, { align: 'center' });

        const rowStep = edge + 2.5 * L.s;
        const rows = Math.max(0, Math.min(14, Math.floor((L.bottom - y + 2.5 * L.s) / rowStep)));
        for (let r = 0; r < rows; r++) {
            const ry = y + r * rowStep;
            label(`Day ${r + 1}`, ry, this.colors.ink, 'normal');
            this._digitBoxes(doc, L, boxesX, ry, PHONE_DIGITS, edge);
            this._setStroke(doc, this.colors.accent, 0.3 * L.s);
            doc.rect(tickX, ry, edge, edge);
        }
        this._footer(doc, L, opts.footerLabel || 'Remember It');
    },

    /** A map of the way home to draw, and how the child gets there. */
    addWayHomePage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Find Your Way', opts.title || 'My Way Home');
        const corner = this._cornerPicture(doc, L, opts.picture, 0.26);
        const colRight = corner ? corner.x : L.right;

        let y = this._note(
            doc,
            L,
            'Draw the way from your school to your home. Mark each turn, and the things you pass, like a temple, a shop or a big tree.',
            L.margin,
            top + 1 * L.s,
            colRight - L.margin
        );
        y = Math.max(y, corner ? corner.bottom : y) + 1 * L.s;

        // The questions below the map take a fixed height; the map gets the rest.
        const step = 9 * L.s;
        const below = step * 7 + 4 * L.s;
        const mapH = Math.max(20 * L.s, L.bottom - y - below);
        this._box(doc, L, L.margin, y, L.contentW, mapH, this.colors.line);
        this._kicker(doc, L, 'Home', L.right - 3 * L.s, y + 5 * L.s, 'right');
        this._kicker(doc, L, 'School', L.margin + 3 * L.s, y + mapH - 3 * L.s);
        y += mapH;

        y += step;
        this._fillIn(doc, L, 'Things I pass on the way', L.margin, L.right, y);
        y = this._rules(doc, L, L.margin, L.right, y + 0.8 * L.s, 1, step);

        y += step;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(F.small);
        doc.setTextColor(this.colors.subtle);
        doc.text('I go home by', L.margin, y);
        const ways = ['walking', 'bus', 'auto', 'van', 'car', 'cycle'];
        const startX = L.margin + this._textWidth(doc, 'I go home by', F.small) + 4 * L.s;
        const slot = (L.right - startX) / ways.length;
        ways.forEach((way, n) => {
            const wx = startX + n * slot;
            this._setStroke(doc, this.colors.subtle, 0.25 * L.s);
            doc.rect(wx, y - L.box, L.box, L.box);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.ink);
            doc.text(way, wx + L.box + 1.2 * L.s, y);
        });

        y += step;
        this._fillIn(doc, L, 'The bus or van number', L.margin, L.right, y);
        y += step;
        this._fillIn(doc, L, 'Who brings me home', L.margin, L.right, y);
        y += step;
        this._fillIn(doc, L, 'Who I call if nobody comes', L.margin, L.right, y);
        this._footer(doc, L, opts.footerLabel || 'My Way Home');
    },

    /**
     * A safe experiment to do at home: the question, what is needed and
     * the steps, then space to guess, record, explain and draw.
     * opts: { title, question, need: string[], steps: string[], picture }.
     */
    addExperimentPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Science at Home', opts.title || 'Experiment');
        const corner = this._cornerPicture(doc, L, opts.picture, 0.28);
        const colRight = corner ? corner.x : L.right;
        const width = (y) => (corner && y < corner.bottom ? colRight : L.right) - L.margin;

        let y = top + 1.5 * L.s;
        if (opts.question) {
            y = this._paragraph(doc, L, opts.question, L.margin, y, width(y), { style: 'bold', size: F.heading });
        }
        y = this._note(doc, L, 'Do this with a grown-up nearby.', L.margin, y, width(y)) + 1 * L.s;
        if (opts.need && opts.need.length) {
            this._kicker(doc, L, 'You need', L.margin, y);
            y = this._paragraph(doc, L, `${opts.need.join(', ')}.`, L.margin, y + 4.5 * L.s, width(y)) + 1 * L.s;
        }
        if (opts.steps && opts.steps.length) {
            this._kicker(doc, L, 'What to do', L.margin, y);
            y += 4.5 * L.s;
            const numberW = 5 * L.s;
            opts.steps.forEach((step, n) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(F.body);
                doc.setTextColor(this.colors.accent);
                doc.text(String(n + 1), L.margin, y);
                y = this._paragraph(doc, L, step, L.margin + numberW, y, width(y) - numberW) + 0.5 * L.s;
            });
        }
        y = Math.max(y, corner ? corner.bottom : y) + 2 * L.s;

        [['I think this will happen', 2], ['What happened', 3], ['Why I think it happened', 2]].forEach(([label, lines]) => {
            if (y + 4 * L.s + lines * L.rowH > L.bottom) return;
            this._kicker(doc, L, label, L.margin, y);
            y = this._rules(doc, L, L.margin, L.right, y + 0.5 * L.s, lines) + 6 * L.s;
        });

        if (L.bottom - y >= 20 * L.s) {
            this._kicker(doc, L, 'Draw what you saw', L.margin, y);
            this._box(doc, L, L.margin, y + 2.5 * L.s, L.contentW, L.bottom - y - 2.5 * L.s, this.colors.line);
        }
        this._footer(doc, L, opts.footerLabel || 'Science at Home');
    },

    /** One question and as many ideas as the child can write, then the best one. */
    addIdeasPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Ideas Lab', opts.title || 'Think of Many Ideas');
        const corner = this._cornerPicture(doc, L, opts.picture, 0.26, 32);
        const colRight = corner ? corner.x : L.right;

        let y = top + 1.5 * L.s;
        if (opts.challenge) {
            y = this._paragraph(doc, L, opts.challenge, L.margin, y, colRight - L.margin, { style: 'bold', size: F.title * 0.9 });
        }
        y = this._note(
            doc,
            L,
            'Write every idea that comes, even silly ones. The best ideas often come after the first few.',
            L.margin,
            y,
            colRight - L.margin
        );
        y = Math.max(y, corner ? corner.bottom : y) + 2 * L.s;

        // Twelve numbered lines in two columns.
        const gutter = 6 * L.s;
        const colW = (L.contentW - gutter) / 2;
        const rowStep = L.rowH * 1.1;
        const perCol = 6;
        for (let n = 0; n < perCol * 2; n++) {
            const x1 = L.margin + Math.floor(n / perCol) * (colW + gutter);
            const ry = y + ((n % perCol) + 1) * rowStep;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.faint);
            doc.text(String(n + 1), x1, ry - 0.8 * L.s);
            this._rule(doc, L, x1 + 5 * L.s, x1 + colW, ry);
        }
        y += perCol * rowStep + 8 * L.s;

        // The best idea: why it could work, and a drawing of it.
        const boxH = L.bottom - y;
        if (boxH >= 24 * L.s) {
            const boxW = (L.contentW - gutter) / 2;
            this._box(doc, L, L.margin, y, boxW, boxH, this.colors.accent);
            this._box(doc, L, L.margin + boxW + gutter, y, boxW, boxH, this.colors.line);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.accent);
            doc.text('My best idea, and why it could work', L.margin + 2.5 * L.s, y + 4.5 * L.s, { maxWidth: boxW - 5 * L.s });
            this._rules(doc, L, L.margin + 2.5 * L.s, L.margin + boxW - 2.5 * L.s, y + 6 * L.s, Math.floor((boxH - 9 * L.s) / L.rowH));
            doc.setTextColor(this.colors.ink);
            doc.text('Draw it', L.margin + boxW + gutter + 2.5 * L.s, y + 4.5 * L.s);
        }
        this._footer(doc, L, opts.footerLabel || 'Ideas Lab');
    },

    /** Everyday tricks, each with four-line space to write it in the child's own words. */
    addTricksPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Clever Tricks', opts.title || 'Tricks to Remember');
        const corner = this._cornerPicture(doc, L, opts.picture, 0.24, 30);
        const right = (y) => (corner && y < corner.bottom ? corner.x : L.right);
        const band = this._defaultBand(L);

        let y = top + 1.5 * L.s;
        (opts.tricks || []).forEach((trick) => {
            if (y + 12 * L.s + band > L.bottom) return;
            y = this._paragraph(doc, L, trick.title, L.margin, y, right(y) - L.margin, { style: 'bold', size: F.heading });
            y = this._paragraph(doc, L, trick.text, L.margin, y, right(y) - L.margin, { size: F.body });
            y = this._note(doc, L, 'Write it in your own words.', L.margin, y + 0.5 * L.s, right(y) - L.margin);
            y = this._writingSets(doc, L, y + 1 * L.s, 2, L.margin, right(y)) + 4 * L.s;
        });
        this._footer(doc, L, opts.footerLabel || 'Clever Tricks');
    },

    /** A large frame to draw or paint in, and lines to write about the picture. */
    addDrawingPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Draw and Paint', opts.title || 'My Picture');
        const corner = this._cornerPicture(doc, L, opts.picture, 0.24, 30);
        const colRight = corner ? corner.x : L.right;

        let y = top + 1.5 * L.s;
        if (opts.prompt) {
            y = this._paragraph(doc, L, opts.prompt, L.margin, y, colRight - L.margin, {
                font: 'times',
                style: 'italic',
                size: F.heading
            });
        }
        y = Math.max(y, corner ? corner.bottom : y) + 1 * L.s;

        const band = this._defaultBand(L);
        const writing = 9 * L.s + band * 2 + band * 0.6;
        const frameH = L.bottom - y - writing;
        if (frameH > 10 * L.s) {
            this._box(doc, L, L.margin, y, L.contentW, frameH, this.colors.accent);
            y += frameH;
        }
        y += 6 * L.s;
        this._kicker(doc, L, 'Write about your picture', L.margin, y);
        this._writingSets(doc, L, y + 3 * L.s, 2);
        this._footer(doc, L, opts.footerLabel || 'Draw and Paint');
    },

    /** Two paints mixed into a third: circles to paint and a line for the new colour's name. */
    addColourMixPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const top = this._header(doc, L, opts.kicker || 'Draw and Paint', opts.title || 'Mixing Colours');
        const corner = this._cornerPicture(doc, L, opts.picture, 0.26, 32);
        const colRight = corner ? corner.x : L.right;

        let y = this._note(
            doc,
            L,
            'Paint the first two circles in each row. Mix the same two paints and fill the last circle with the new colour. Write its name on the line.',
            L.margin,
            top + 1 * L.s,
            colRight - L.margin
        );
        y = Math.max(y, corner ? corner.bottom : y) + 2 * L.s;

        const pairs = [['red', 'yellow'], ['yellow', 'blue'], ['blue', 'red'], ['red', 'white'], ['blue', 'white'], ['', ''], ['', '']];
        const labelH = 5 * L.s;
        const rowGap = 4 * L.s;
        const r = Math.min(10 * L.s, (L.bottom - y - pairs.length * (labelH + rowGap)) / (pairs.length * 2));
        const rowH = r * 2 + labelH + rowGap;
        const sign = (text, x, cy) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(F.heading);
            doc.setTextColor(this.colors.subtle);
            doc.text(text, x, cy + F.heading * 0.3528 * 0.35, { align: 'center' });
        };
        pairs.forEach(([a, b], n) => {
            const cy = y + n * rowH + r;
            if (cy + r + labelH > L.bottom) return;
            const xs = [L.margin + r, L.margin + r * 4, L.margin + r * 7];
            this._setStroke(doc, this.colors.subtle, 0.3 * L.s);
            xs.forEach((cx) => doc.circle(cx, cy, r, 'S'));
            sign('+', (xs[0] + xs[1]) / 2, cy);
            sign('=', (xs[1] + xs[2]) / 2, cy);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.small);
            doc.setTextColor(this.colors.ink);
            [a, b].forEach((name, k) => {
                if (name) doc.text(name, xs[k], cy + r + labelH * 0.8, { align: 'center' });
            });
            if (!a) {
                doc.setTextColor(this.colors.subtle);
                doc.text('my own mix', xs[0] - r, cy + r + labelH * 0.8);
            }
            this._rule(doc, L, xs[2] + r + 5 * L.s, L.right, cy + r * 0.4);
        });
        this._footer(doc, L, opts.footerLabel || 'Mixing Colours');
    },

    /** The last page: the date the journal was finished and what got better. */
    addFinishPage(doc, paperDimensions, opts = {}) {
        if (!doc) throw new Error('Invalid document instance');
        this._newPage(doc);
        const L = this._layout(paperDimensions || this._paper);
        const F = this._fonts(L);
        const hasPicture = this._hasPicture(opts.picture);
        let y = L.h * (hasPicture ? 0.12 : 0.22);

        this._kicker(doc, L, opts.kicker || 'Well Done', L.centerX, y, 'center');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(F.title * 1.5);
        doc.setTextColor(this.colors.ink);
        y += 10 * L.s;
        doc.text(opts.title || 'I Finished My Journal', L.centerX, y, { align: 'center', maxWidth: L.contentW });
        if (hasPicture) {
            this._picture(doc, opts.picture, L.margin, y + 6 * L.s, L.contentW, L.h * 0.3);
            y += 6 * L.s + L.h * 0.3;
        }

        const step = 11 * L.s;
        const half = L.contentW * 0.42;
        ['I finished on', 'The letters that got better', 'What I liked most', 'A grown-up\'s note'].forEach((label) => {
            y += step;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(F.body);
            doc.setTextColor(this.colors.subtle);
            doc.text(label, L.centerX, y, { align: 'center' });
            this._rule(doc, L, L.centerX - half, L.centerX + half, y + 7 * L.s);
            y += 7 * L.s;
        });
        this._footer(doc, L, opts.footerLabel || 'Well Done');
    }
};

export { kidsPages };
