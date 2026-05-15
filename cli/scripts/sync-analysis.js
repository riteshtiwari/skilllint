// Keeps cli/src/staticAnalysis.js in sync with src/lib/staticAnalysis.js.
//
// Usage:
//   node cli/scripts/sync-analysis.js          copy if out of sync, exit 0
//   node cli/scripts/sync-analysis.js --check  exit 1 if out of sync (CI / prepublishOnly)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOURCE = resolve(__dirname, '../../src/lib/staticAnalysis.js');
const DEST   = resolve(__dirname, '../src/staticAnalysis.js');
const STAMP  = '// AUTO-SYNCED from src/lib/staticAnalysis.js — do not edit directly\n';
const CHECK  = process.argv.includes('--check');

if (!existsSync(SOURCE)) {
  // Running from the standalone cli package, not the monorepo — skip check.
  process.stdout.write('sync-analysis: source not found (standalone publish) — skipping check.\n');
  process.exit(0);
}

const src  = readFileSync(SOURCE, 'utf8');
const dest = existsSync(DEST) ? readFileSync(DEST, 'utf8') : null;
const synced = STAMP + src;

if (dest === synced) {
  process.stdout.write('staticAnalysis.js is in sync.\n');
  process.exit(0);
}

if (CHECK) {
  process.stderr.write(
    'staticAnalysis.js is OUT OF SYNC.\n' +
    'Run: node cli/scripts/sync-analysis.js\n'
  );
  process.exit(1);
}

writeFileSync(DEST, synced, 'utf8');
process.stdout.write('Synced staticAnalysis.js → cli/src/staticAnalysis.js\n');
