#!/usr/bin/env node

// EPIPE: suppress broken-pipe errors so `skilllint file.md | head -5` exits cleanly.
process.stdout.on('error', (err) => { if (err.code === 'EPIPE') process.exit(0); });
process.stderr.on('error', (err) => { if (err.code === 'EPIPE') process.exit(0); });

import('../src/index.js').catch((err) => {
  process.stderr.write(`skilllint: failed to load: ${err.stack || err.message}\n`);
  process.exit(3); // EXIT_ERROR — not a lint result, a tool failure
});
