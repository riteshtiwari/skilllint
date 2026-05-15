// All terminal output lives here.
// Colors emit only when stdout is a TTY and NO_COLOR is unset.

const CATEGORY_ORDER = [
  'structural_integrity',
  'token_economics',
  'discoverability',
  'scope_boundaries',
  'examples_evidence',
  'security',
];

const CATEGORY_LABELS = {
  structural_integrity: 'Structural Integrity',
  token_economics:      'Token Economics',
  discoverability:      'Discoverability',
  scope_boundaries:     'Scope Boundaries',
  examples_evidence:    'Examples & Evidence',
  security:             'Security',
};

function c(str, code, useColor) {
  return useColor ? `\x1b[${code}m${str}\x1b[0m` : str;
}

// scoreBar returns a colored score string.
// All color codes used here are 2 digits (31, 32, 33, 36), so ANSI overhead
// is always: \x1b[XXm (5 bytes) + \x1b[0m (4 bytes) = 9 bytes.
// padStart must account for these invisible bytes to maintain visual alignment.
const ANSI_OVERHEAD = 9;

function scoreBar(score, useColor) {
  const raw = `${score}/100`;
  if (score >= 80) return c(raw, '32', useColor);
  if (score >= 50) return c(raw, '33', useColor);
  return c(raw, '31', useColor);
}

// scoreCol returns a right-aligned score string for a fixed-width column.
// Visual width is always 7 ("100/100" is the widest value). Scores below 100
// are right-aligned within that column. In color mode the string has 9 extra
// ANSI bytes — padStart must target 7 + 9 = 16 to hit visual width 7.
function scoreCol(score, useColor) {
  return scoreBar(score, useColor).padStart(7 + (useColor ? ANSI_OVERHEAD : 0));
}

function wrap(text, maxWidth, indent) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? cur + ' ' + w : w;
    // If word alone exceeds maxWidth, let it overflow rather than infinite-loop.
    if (candidate.length > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines.join('\n' + indent);
}

function printCategory(key, cat, useColor, minScore, w) {
  const label = CATEGORY_LABELS[key];
  const score = cat.score;

  // Two leading spaces + label column (22) + score column (6 visual) + summary.
  // Matches the Overall row layout exactly.
  w(`  ${label.padEnd(22)} ${scoreCol(score, useColor)}  ${cat.summary}\n`);

  // Show check detail for any imperfect category (score < 100), not just below
  // minScore. A category at 85 still has useful check-level information.
  // The Fix suggestion only appears when the category is below minScore.
  if (score < 100) {
    for (const check of cat.checks) {
      const icon = check.passed
        ? c('[PASS]', '32', useColor)
        : c('[FAIL]', '31', useColor);
      w(`           ${icon} ${check.text}\n`);
    }
    if (cat.improvement && score < minScore) {
      // Output is: "  " (2) + "Fix: " (5) + content.
      // Total prefix width = 7. Continuation lines must indent 7 spaces to align.
      const label = 'Fix: ';
      const continuationIndent = ' '.repeat(2 + label.length);
      const wrapped = wrap(cat.improvement, 72 - (2 + label.length), continuationIndent);
      w(`  ${c(label + wrapped, '36', useColor)}\n`);
    }
    w('\n');
  }
}

export function renderReport({ result, filePath, useColor, minScore, version }) {
  const w = (s) => process.stdout.write(s);
  const nl = () => w('\n');

  w(`skilllint v${version}\n`);
  nl();
  w(`File: ${filePath}\n`);

  if (result.invalidFile) {
    nl();
    w(c(`Error: ${result.invalidReason}`, '31', useColor) + '\n');
    nl();
    w(`A skill file needs at least 50 words and at least one structural signal:\n`);
    w(`  - a description: frontmatter field\n`);
    w(`  - a trigger: field\n`);
    w(`  - imperative instructions (Use, Run, Call, Never, Always...)\n`);
    nl();
    w(`More at ${c('https://skilllint.dev', '36', useColor)}\n`);
    nl();
    return;
  }

  const { fileStats, staticScore, staticCategories, heuristicsEvaluated, heuristicsRemaining } = result;

  w(`Lines: ${fileStats.lines}  `);
  w(`Words: ${fileStats.words}  `);
  w(`Tokens: ~${fileStats.token_estimate}  `);
  w(`Examples: ${fileStats.has_examples ? c('yes', '32', useColor) : c('no', '31', useColor)}  `);
  w(`Neg triggers: ${fileStats.has_negative_triggers ? c('yes', '32', useColor) : c('no', '31', useColor)}  `);
  w(`Output spec: ${fileStats.has_output_spec ? c('yes', '32', useColor) : c('no', '31', useColor)}\n`);
  nl();

  w(`  ${'Overall'.padEnd(22)} ${scoreCol(staticScore, useColor)}  `);
  w(`${heuristicsEvaluated} of ${heuristicsEvaluated + heuristicsRemaining} heuristics evaluated statically\n`);
  nl();

  const failingCount = CATEGORY_ORDER.filter(
    k => staticCategories[k] && staticCategories[k].score < minScore
  ).length;

  for (const key of CATEGORY_ORDER) {
    const cat = staticCategories[key];
    if (!cat) continue;
    printCategory(key, cat, useColor, minScore, w);
  }

  if (failingCount === 0) {
    w(c('No categories below threshold.', '32', useColor) + '\n');
    nl();
  }

  if (heuristicsRemaining > 0) {
    w(c(`+ ${heuristicsRemaining} more heuristics require LLM evaluation`, '33', useColor) + '\n');
    w(`  Run the full evaluation at ${c('https://skilllint.dev', '36', useColor)}\n`);
    nl();
  }
}
