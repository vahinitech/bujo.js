#!/usr/bin/env node
// Builds every edition on every recommended paper into PDF files plus a
// manifest.json, for sites that publish the printables as static files.
//
//   node scripts/build-printables.mjs [--footer "text"] [--out dir]
//
// The same source and options always give byte-identical PDFs. The
// pictures come from art/ (see scripts/art.mjs).

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { EDITIONS, buildEdition, usedPictures } from '../src/bujo.js';
import { loadArt } from './art.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
    const args = { footer: null, out: join(root, 'dist', 'printables') };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--footer' || arg === '--out') {
            const value = argv[i + 1];
            if (value === undefined || value.startsWith('--') || value === '-h') throw new Error(`${arg} needs a value`);
            if (arg === '--footer') args.footer = value.trim() || null;
            else args.out = resolve(value);
            i++;
        } else if (arg === '--help' || arg === '-h') {
            args.help = true;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }
    return args;
}

function gitCommit() {
    try {
        return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim() || null;
    } catch {
        return null;
    }
}

function main() {
    let args;
    try {
        args = parseArgs(process.argv.slice(2));
    } catch (err) {
        console.error(err.message);
        process.exit(2);
    }
    if (args.help) {
        console.log('Usage: node scripts/build-printables.mjs [--footer "text"] [--out dir]');
        return;
    }

    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    mkdirSync(args.out, { recursive: true });

    const { art } = loadArt();
    const commit = gitCommit();
    const files = [];
    for (const edition of EDITIONS) {
        const missing = usedPictures(edition.id).filter((id) => !art[id]);
        if (missing.length) throw new Error(`${edition.id}: art/ has no ${missing.join(', ')}`);
        for (const paper of edition.papers) {
            const doc = buildEdition(edition.id, paper, { footer: args.footer, art, sourceRevision: commit });
            const pages = doc.getNumberOfPages();
            if (pages !== edition.pages) {
                throw new Error(`${edition.id} ${paper}: built ${pages} pages, expected ${edition.pages}`);
            }
            const bytes = Buffer.from(doc.output('arraybuffer'));
            const file = `${edition.id}-${paper.toLowerCase()}.pdf`;
            writeFileSync(join(args.out, file), bytes);
            files.push({
                id: edition.id,
                title: edition.title,
                description: edition.description,
                paper,
                pages,
                file,
                bytes: bytes.length,
                sha256: createHash('sha256').update(bytes).digest('hex')
            });
            console.log(`${file}  ${pages} pages  ${bytes.length} bytes`);
        }
    }

    const manifest = {
        generator: 'bujo.js',
        version: pkg.version,
        commit,
        footer: args.footer,
        files
    };
    writeFileSync(join(args.out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest.json  ${files.length} files  -> ${args.out}`);
}

main();
