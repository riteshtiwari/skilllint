import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { runStaticAnalysis } from './staticAnalysis.js';
import { renderReport } from './reporter.js';
import { checkForUpdate } from './updateCheck.js';
import { EXIT_OK, EXIT_ISSUES, EXIT_INVALID, EXIT_ERROR } from './exitCodes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { version: VERSION } = require('../package.json');

const MAX_FILE_BYTES = 1024 * 1024;

function expandTilde(p) {
  if (p === '~' || p.startsWith('~/')) return p.replace(/^~/, homedir());
  return p;
}

const HELP = `
skilllint v${VERSION} — lint Claude skill files

Usage:
  skilllint <file>              Analyze a skill file
  skilllint --install-skill     Install /skilllint into Claude Code
  skilllint --version           Print version
  skilllint --help              Print this message

Install the Claude skill:
  npx @tiwariritesh/skilllint --install-skill

Flags:
  --min-score <n>   Score threshold for exit 1. Default: 50. Range: 0–100.
  --no-color        Suppress ANSI color codes. Also respects NO_COLOR env var.
  --json            Emit raw JSON instead of formatted output. Exit codes apply.

Exit codes:
  0  Score above threshold, no critical issues
  1  Score below threshold
  2  File is not a valid skill file
  3  File not found, unreadable, bad flag, or tool error

Run the full 80-heuristic evaluation at https://skilllint.dev
`.trim();

function installSkill(useColor) {
  const c = (str, code) => useColor ? `\x1b[${code}m${str}\x1b[0m` : str;
  const w = (s) => process.stdout.write(s);

  const src  = resolve(__dirname, '../skill/SKILL.md');
  const dest = join(homedir(), '.claude', 'skills', 'skilllint', 'SKILL.md');
  const destDir = dirname(dest);

  if (!existsSync(src)) {
    process.stderr.write('skilllint: skill file not found in package — reinstall skilllint\n');
    process.exit(EXIT_ERROR);
  }

  const alreadyInstalled = existsSync(dest);

  let skillContent;
  try {
    skillContent = readFileSync(src, 'utf8');
  } catch (err) {
    process.stderr.write(`skilllint: could not read skill file: ${err.message}\n`);
    process.exit(EXIT_ERROR);
  }

  try {
    mkdirSync(destDir, { recursive: true });
    const trailer = skillContent.endsWith('\n') ? '' : '\n';
    writeFileSync(dest, `${skillContent}${trailer}<!-- skilllint v${VERSION} -->\n`, 'utf8');
  } catch (err) {
    process.stderr.write(`skilllint: could not install skill: ${err.message}\n`);
    process.exit(EXIT_ERROR);
  }

  const written = existsSync(dest) ? statSync(dest).size : 0;
  if (written === 0) {
    process.stderr.write('skilllint: skill file was written but appears empty — try again\n');
    process.exit(EXIT_ERROR);
  }

  w('\n');
  w(c('skilllint skill installed.', '32') + '\n');
  w('\n');
  w(`Location: ${c(dest, '36')}\n`);
  w('\n');

  if (alreadyInstalled) {
    w('Updated existing installation.\n');
  } else {
    w('In any Claude Code session, type:\n');
    w('\n');
    w(`  ${c('/skilllint path/to/your-skill.md', '33')}\n`);
    w('\n');
    w('Claude will run a full 80-heuristic evaluation directly in the conversation.\n');
  }

  w('\n');
  w(`To get future updates: ${c('npx @tiwariritesh/skilllint@latest --install-skill', '33')}\n`);
  w('\n');
}

function parseArgs(argv) {
  const args = {
    file: null,
    json: false,
    noColor: false,
    minScore: 50,
    help: false,
    version: false,
    installSkill: false,
  };

  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--json')             { args.json = true; }
    else if (a === '--no-color')    { args.noColor = true; }
    else if (a === '--version')     { args.version = true; }
    else if (a === '--help')        { args.help = true; }
    else if (a === '--install-skill') { args.installSkill = true; }
    else if (a === '--min-score') {
      i++;
      const raw = argv[i];
      if (raw === undefined || raw.startsWith('-')) {
        process.stderr.write('skilllint: --min-score requires a value (0–100)\n');
        process.exit(EXIT_ERROR);
      }
      if (!/^\d+$/.test(raw)) {
        process.stderr.write(`skilllint: --min-score must be an integer (0–100), got: ${raw}\n`);
        process.exit(EXIT_ERROR);
      }
      const val = parseInt(raw, 10);
      if (val < 0 || val > 100) {
        process.stderr.write(`skilllint: --min-score must be between 0 and 100, got: ${val}\n`);
        process.exit(EXIT_ERROR);
      }
      args.minScore = val;
    }
    else if (a.startsWith('-')) {
      process.stderr.write(`skilllint: unrecognized option: ${a}\n`);
      process.exit(EXIT_ERROR);
    }
    else if (args.file === null) {
      args.file = a;
    }
    i++;
  }

  return args;
}

function resolveExitCode(result, minScore) {
  if (result.invalidFile) return EXIT_INVALID;
  if (typeof result.staticScore !== 'number') return EXIT_ERROR;
  if (result.staticScore < minScore) return EXIT_ISSUES;
  return EXIT_OK;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const useColor = !args.noColor
    && process.stdout.isTTY === true
    && process.env.NO_COLOR === undefined;

  if (args.version) {
    process.stdout.write(`skilllint v${VERSION}\n`);
    process.exit(EXIT_OK);
  }

  if (args.installSkill) {
    installSkill(useColor);
    process.exit(EXIT_OK);
  }

  if (args.help || args.file === null) {
    process.stdout.write(HELP + '\n');
    process.exit(args.file === null && !args.help ? EXIT_ERROR : EXIT_OK);
  }

  const filePath = resolve(expandTilde(args.file));

  // Start the update check now so it runs in parallel with file I/O and
  // analysis. Skipped in --json mode (stdout must be clean JSON) and in CI.
  const updatePromise = (args.json || process.env.CI)
    ? Promise.resolve(null)
    : checkForUpdate(VERSION);

  if (!existsSync(filePath)) {
    process.stderr.write(`skilllint: file not found: ${args.file}\n`);
    process.exit(EXIT_ERROR);
  }

  const stat = statSync(filePath);

  if (stat.isDirectory()) {
    process.stderr.write(`skilllint: expected a file, got a directory: ${args.file}\n`);
    process.exit(EXIT_ERROR);
  }

  if (stat.size > MAX_FILE_BYTES) {
    process.stderr.write(`skilllint: file is too large (${Math.round(stat.size / 1024)}KB) — skill files should be under 1MB\n`);
    process.exit(EXIT_INVALID);
  }

  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch (err) {
    process.stderr.write(`skilllint: cannot read file: ${err.message}\n`);
    process.exit(EXIT_ERROR);
  }

  if (text.includes('\0')) {
    process.stderr.write(`skilllint: file appears to be binary — skill files must be plain text\n`);
    process.exit(EXIT_INVALID);
  }

  let result;
  try {
    result = runStaticAnalysis(text);
  } catch (err) {
    process.stderr.write(`skilllint: analysis failed: ${err.message}\n`);
    process.exit(EXIT_ERROR);
  }

  const exitCode = resolveExitCode(result, args.minScore);

  if (args.json) {
    process.stdout.write(
      JSON.stringify({ file: basename(filePath), ...result }, null, 2) + '\n'
    );
    process.exit(exitCode);
  }

  renderReport({
    result,
    filePath: args.file,
    useColor,
    minScore: args.minScore,
    version: VERSION,
  });

  // Wait for the update check — but no longer than 2s after analysis completes,
  // so a slow network never stalls a fast lint run. The fetch itself has a 5s
  // internal timeout; if analysis consumed most of that, this resolves quickly.
  const latestVersion = await Promise.race([
    updatePromise,
    new Promise(resolve => setTimeout(() => resolve(null), 2000)),
  ]);

  if (latestVersion) {
    const msg = `Update available: v${VERSION} → v${latestVersion}\n  Run: npx @tiwariritesh/skilllint@latest --install-skill\n`;
    process.stdout.write('\n' + (useColor ? `\x1b[33m${msg}\x1b[0m` : msg) + '\n');
  }

  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`skilllint: unexpected error: ${err.stack || err.message}\n`);
  process.exit(EXIT_ERROR);
});
