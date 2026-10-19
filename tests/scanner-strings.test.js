// No tracked file may look like malware to the server's scanner.
//
// The vahinitech.com server runs maldet nightly over home folders and /tmp.
// It flagged our own test payloads in other repositories on 2026-10-16, and
// on 2026-10-19 found one in a compiled file whose source had split it with
// + (compilers and bundlers fold two literals into one constant). Payloads
// are joined at run time with a call, such as [...].join(''), and this test
// keeps every tracked file and name clear. Where maldet's hex.dat is
// readable, every literal signature in it is checked too.
// VAHINI_MALDET_SIGS points at another file; "none" skips it. Rule:
// https://github.com/vahinitech/Umbrella/blob/main/skills/scanner-strings/SKILL.md

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Every pattern is assembled with a call, so this file passes itself.
const OPEN = ['<', '?php'].join('');
const CALLS = ['system', 'eval', 'exec', 'passthru', 'shell_exec', 'popen', 'proc_open', 'assert', 'base64_decode'];
const BUILT_IN = [
    {
        name: 'PHP open tag joined to a shell or eval call',
        re: new RegExp(`${OPEN.replace('?', '\\?')}\\s*@?(${CALLS.join('|')})\\s*\\(`, 'i'),
    },
    { name: 'EICAR test string', re: new RegExp(['EICAR-', 'STANDARD-ANTIVIRUS-', 'TEST-FILE'].join('')) },
];
const SHELL_NAMES = /(^|\/)(shell|cmd|c99|r57|wso|b374k|webshell|backdoor)\d*\.(php\d?|phtml|asp|aspx|jsp)$/i;
// Media and font files are not text anyone writes; the maldet half skips them.
const MEDIA = /\.(pdf|png|jpe?g|webp|gif|ico|woff2?|ttf|otf)$/i;

function loadMaldet() {
    const file = process.env.VAHINI_MALDET_SIGS || '/usr/local/maldetect/sigs/hex.dat';
    if (file === 'none') return [];
    let text;
    try {
        text = fs.readFileSync(file, 'latin1');
    } catch {
        return [];
    }
    const sigs = [];
    for (const line of text.split('\n')) {
        const [hex, name] = line.trim().split(':');
        // "*" wildcard lines target binaries and archives.
        if (!hex || !name || !/^([0-9a-f]{2})+$/i.test(hex)) continue;
        sigs.push({ name, bytes: Buffer.from(hex, 'hex') });
    }
    return sigs;
}

function findHits(rel, buf, maldet) {
    const hits = [];
    if (SHELL_NAMES.test(rel)) hits.push('file name looks like a web shell');
    const text = buf.toString('latin1');
    for (const p of BUILT_IN) if (p.re.test(text)) hits.push(p.name);
    if (!MEDIA.test(rel)) for (const s of maldet) if (buf.includes(s.bytes)) hits.push(`maldet ${s.name}`);
    return hits;
}

const joined = Buffer.from(['x', OPEN, ' system($_GET[0]); ?>'].join(''));

describe('scanner strings', () => {
    test('the checker catches a joined payload and passes a split one', () => {
        expect(findHits('a.js', joined, []).length).toBeGreaterThan(0);
        const split = Buffer.from(['x"', OPEN, ' " + "system($_GET[0]); ?>"'].join(''));
        expect(findHits('a.js', split, [])).toEqual([]);
        expect(findHits('public/shell.php', Buffer.from('ok'), []).length).toBeGreaterThan(0);
        expect(findHits('scripts/shell_check.js', Buffer.from('ok'), [])).toEqual([]);
    });

    test('maldet signatures load when the file is readable', () => {
        const maldet = loadMaldet();
        if (!maldet.length) return; // not on this machine
        expect(findHits('a.js', joined, maldet).some((h) => h.startsWith('maldet '))).toBe(true);
    });

    test('no tracked file matches', () => {
        const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
        const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
        const maldet = loadMaldet();
        const bad = [];
        for (const rel of files) {
            const full = path.join(root, rel);
            let st;
            try {
                st = fs.lstatSync(full);
            } catch {
                continue;
            }
            if (!st.isFile()) continue;
            const hits = findHits(rel, fs.readFileSync(full), maldet);
            if (hits.length) bad.push(`${rel}: ${hits.join(', ')}`);
        }
        // A hit means: build the payload at run time with a join call, never + of literals.
        expect(bad).toEqual([]);
    });
});
