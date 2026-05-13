// All regex patterns are defined inside the functions that use them.
// Never hoist /g or /gi patterns to module scope — stateful lastIndex
// causes incorrect results on repeated calls.

const splitLines = (text) => text.split("\n");
const splitWords = (text) => text.trim().split(/\s+/).filter(Boolean);
const estimateTokens = (text) => Math.round(text.length / 4);

// ── Structural integrity ──────────────────────────────────────────────────────

function checkStructuralIntegrity(text) {
  const issues = [];
  const fixes = [];
  let score = 100;
  const lineArr = splitLines(text);

  // Code block closure — odd fence count means an unclosed block
  const fenceCount = (text.match(/^```/gm) || []).length;
  if (fenceCount % 2 !== 0) {
    issues.push("Unclosed code block — odd number of ``` fences");
    fixes.push("Find and close every opening ``` with a matching closing ```");
    score -= 20;
  }

  // Heading hierarchy — no level skips
  const headingLevels = lineArr
    .filter(l => /^#{1,6}\s/.test(l))
    .map(l => l.match(/^(#+)/)[1].length);
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      issues.push(`Heading hierarchy skips a level (H${headingLevels[i - 1]} → H${headingLevels[i]})`);
      fixes.push("Use sequential heading levels: H1 → H2 → H3, never skip");
      score -= 15;
      break;
    }
  }

  // Mixed bullet styles
  const bulletLines = lineArr.filter(l => /^\s*[-*+]\s/.test(l));
  const bulletStyles = new Set(bulletLines.map(l => l.trim()[0]));
  if (bulletStyles.size > 1) {
    issues.push("Mixed bullet styles (-, *, +) in same document");
    fixes.push("Pick one bullet character and use it throughout — prefer -");
    score -= 10;
  }

  // Nesting depth — beyond 3 levels is unreliable
  const nestingDepths = lineArr
    .filter(l => /^\s+[-*+]/.test(l))
    .map(l => Math.floor((l.match(/^(\s+)/)?.[1].length ?? 0) / 2));
  const maxNesting = nestingDepths.reduce((a, b) => Math.max(a, b), 0);
  if (maxNesting > 3) {
    issues.push(`List nesting is ${maxNesting} levels deep — too deep to parse reliably`);
    fixes.push("Flatten nested lists beyond 3 levels into prose or separate sections");
    score -= 10;
  }

  // Empty sections — heading with no content before the next heading (blank lines don't count)
  for (let i = 0; i < lineArr.length - 1; i++) {
    if (/^#{1,6}\s/.test(lineArr[i])) {
      let j = i + 1;
      while (j < lineArr.length && lineArr[j].trim() === "") j++;
      if (j < lineArr.length && /^#{1,6}\s/.test(lineArr[j])) {
        const heading = lineArr[i].replace(/^#+\s*/, "");
        issues.push(`Section "${heading}" has no content`);
        fixes.push("Either add content to this section or remove the heading");
        score -= 10;
        break;
      }
    }
  }

  return {
    score: Math.max(0, score),
    issues,
    fixes,
    summary: issues.length === 0
      ? "Structure is clean and well-formed."
      : `${issues.length} structural problem${issues.length > 1 ? "s" : ""} found.`,
  };
}

// ── Token economics ───────────────────────────────────────────────────────────

function checkTokenEconomics(text) {
  const issues = [];
  const fixes = [];
  let score = 100;
  const tokenCount = estimateTokens(text);
  const lineArr = splitLines(text);

  // File size
  if (tokenCount > 800) {
    issues.push(`File is ~${tokenCount} tokens — very large for a skill file`);
    fixes.push("Target under 500 tokens. Cut redundant instructions, verbose explanations, repeated points");
    score -= 25;
  } else if (tokenCount > 500) {
    issues.push(`File is ~${tokenCount} tokens — on the larger side`);
    fixes.push("Review for redundancy. Aim for under 400 tokens without losing coverage");
    score -= 10;
  }

  // Preamble bloat — lines before the first instruction verb
  const instructionVerbs = /^(use|run|call|load|read|write|create|generate|save|return|check|verify|ensure|if|when|do not|never|always|first|then|finally)/i;
  let preambleLines = 0;
  for (const line of lineArr) {
    if (instructionVerbs.test(line.trim())) break;
    if (line.trim().length > 0) preambleLines++;
  }
  if (preambleLines > 8) {
    issues.push(`${preambleLines} lines before first instruction — too much preamble`);
    fixes.push("Get to instructions within 5 lines. Move context after the first instruction block");
    score -= 15;
  }

  // Filler language — patterns defined here, not at module scope
  const fillerPatterns = [
    /please\s/i, /make sure to\s/i, /it is important (that|to)\s/i,
    /you should\s/i, /be sure to\s/i, /don't forget to\s/i,
    /note that\s/i, /keep in mind\s/i, /remember to\s/i,
  ];
  const hasFillerLanguage = fillerPatterns.some(p => p.test(text));
  if (hasFillerLanguage) {
    issues.push("Filler language found — softens instructions and wastes tokens");
    fixes.push("Remove: 'please', 'make sure to', 'it is important that', 'you should'. Use direct commands.");
    score -= 10;
  }

  // Passive voice in instructions — patterns defined here
  const passivePattern = /\b(should be|must be|will be|can be|may be|is being|are being|was being|were being)\s+\w+ed\b/i;
  const passiveMatches = (text.match(new RegExp(passivePattern.source, "gi")) || []).length;
  if (passiveMatches > 2) {
    issues.push(`${passiveMatches} passive voice constructions in instructions`);
    fixes.push("Rewrite as active commands. 'The file should be saved' → 'Save the file to...'");
    score -= 10;
  }

  // Redundancy — duplicate sentences (simple exact-match check)
  const sentences = text.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 20);
  const seen = new Set();
  let duplicates = 0;
  for (const s of sentences) {
    if (seen.has(s)) duplicates++;
    seen.add(s);
  }
  if (duplicates > 0) {
    issues.push(`${duplicates} duplicate sentence${duplicates > 1 ? "s" : ""} found`);
    fixes.push("State each instruction exactly once. Remove or merge repeated points.");
    score -= duplicates * 5;
  }

  return {
    score: Math.max(0, score),
    issues,
    fixes,
    summary: issues.length === 0
      ? "Token usage is efficient."
      : `~${Math.round(tokenCount * 0.15)} tokens likely wasted on bloat.`,
  };
}

// ── Discoverability ───────────────────────────────────────────────────────────

function checkDiscoverability(text) {
  const issues = [];
  const fixes = [];
  let score = 100;

  // Description or trigger field present
  const hasDescription = /^description:/im.test(text) || /^## (description|trigger|when to use)/im.test(text);
  if (!hasDescription) {
    issues.push("No description or trigger field found");
    fixes.push("Add a 'description:' frontmatter field or '## Description' section that explains exactly when this skill should activate");
    score -= 30;
  }

  // Negative triggers — when NOT to use
  const hasNegativeTrigger = /do not use|never use|not for|except when|don't use|avoid using|skip (this|when)/i.test(text);
  if (!hasNegativeTrigger) {
    issues.push("No negative trigger examples (when NOT to use this skill)");
    fixes.push("Add explicit exclusions. Example: 'Do NOT use for reading existing PDFs, only for creating new ones'");
    score -= 25;
  }

  // Trigger description length — very short is likely too vague
  const descMatch = text.match(/description:\s*["']?(.+?)["']?(\n|$)/i);
  if (descMatch && descMatch[1].split(" ").length < 10) {
    issues.push("Trigger description is very short — likely too vague to fire reliably");
    fixes.push("Expand to at least 20 words. Include specific phrases users would actually say.");
    score -= 20;
  }

  return {
    score: Math.max(0, score),
    issues,
    fixes,
    summary: issues.length === 0
      ? "Basic trigger signals present."
      : "Trigger has structural gaps that will cause misfires.",
  };
}

// ── Scope boundaries ──────────────────────────────────────────────────────────

function checkScopeBoundaries(text) {
  const issues = [];
  const fixes = [];
  let score = 100;

  // Output specification
  const hasOutputSpec = /output|return|result|save|write|export|produce|generate/i.test(text);
  if (!hasOutputSpec) {
    issues.push("No output specification found");
    fixes.push("Specify exactly what Claude should produce: file format, location, naming convention, structure");
    score -= 35;
  }

  // Hard limits
  const hasHardLimits = /do not|never|must not|will not|cannot|don't|won't/i.test(text);
  if (!hasHardLimits) {
    issues.push("No hard limits defined");
    fixes.push("Add explicit limits: what this skill will not do, what inputs it rejects, what actions it will never take");
    score -= 25;
  }

  return {
    score: Math.max(0, score),
    issues,
    fixes,
    summary: issues.length === 0
      ? "Basic scope signals present."
      : "Scope boundaries are underspecified.",
  };
}

// ── Examples ──────────────────────────────────────────────────────────────────

function checkExamples(text) {
  const issues = [];
  const fixes = [];
  let score = 100;

  const hasExample = /example|e\.g\.|for instance|input:|output:|sample/i.test(text);
  if (!hasExample) {
    issues.push("No examples found");
    fixes.push("Add at least one concrete input/output example. Show real usage, not a trivial case.");
    score -= 50;
  }

  const hasNegativeExample = /bad input|wrong|invalid|malformed|not like|do not|incorrect example/i.test(text);
  if (!hasNegativeExample) {
    issues.push("No negative examples (what bad input looks like)");
    fixes.push("Show at least one example of input this skill should reject or handle gracefully");
    score -= 25;
  }

  return {
    score: Math.max(0, score),
    issues,
    fixes,
    summary: hasExample
      ? "Has examples but missing edge case coverage."
      : "No examples — Claude will guess at intended behavior.",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function runStaticAnalysis(text) {
  const structural   = checkStructuralIntegrity(text);
  const tokens       = checkTokenEconomics(text);
  const discoverability = checkDiscoverability(text);
  const scope        = checkScopeBoundaries(text);
  const examples     = checkExamples(text);

  const fileStats = {
    lines:                splitLines(text).length,
    words:                splitWords(text).length,
    token_estimate:       estimateTokens(text),
    has_examples:         /example|e\.g\.|input:|output:/i.test(text),
    has_negative_triggers:/do not use|never use|not for|except when/i.test(text),
    has_output_spec:      /output|returns|produces|saves to|writes to/i.test(text),
  };

  // Weights aligned to LLM evaluation weights for the five categories we check.
  // Divide first, then round — applying Math.round before division amplifies rounding error by ~1.89x.
  const staticScore = (
    structural.score    * 0.08 +
    tokens.score        * 0.10 +
    discoverability.score * 0.15 +
    scope.score         * 0.12 +
    examples.score      * 0.08
  ) / 0.53; // normalise to 0-100 over the weight slice we evaluate

  return {
    staticScore: Math.min(100, Math.round(staticScore)),
    fileStats,
    // Keys match CATEGORIES ids in App.jsx exactly
    staticCategories: {
      structural_integrity: structural,
      token_economics:      tokens,
      discoverability:      discoverability,
      scope_boundaries:     scope,
      examples_evidence:    examples,
    },
    heuristicsEvaluated: 22,
    heuristicsRemaining: 53,
    needsLLM: true,
  };
}
