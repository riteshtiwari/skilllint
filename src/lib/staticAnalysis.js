// All regex patterns are defined inside the functions that use them.
// Never hoist /g or /gi patterns to module scope — stateful lastIndex
// causes incorrect results on repeated calls.

const splitLines = (text) => text.split("\n");
const splitWords = (text) => text.trim().split(/\s+/).filter(Boolean);
const estimateTokens = (text) => Math.round(text.length / 4);

// ── Structural integrity ──────────────────────────────────────────────────────

function checkStructuralIntegrity(text) {
  const checks = [];
  let score = 0;
  const lineArr = splitLines(text);
  const nonEmpty = lineArr.filter(l => l.trim());

  if (nonEmpty.length < 5) {
    return {
      score: 0,
      checks: [{ passed: false, text: "File is too short to evaluate" }],
      checkedSummary: "heading hierarchy, bullet style, code block closure, nesting depth, empty sections",
      improvement: "Add more content — a skill file needs at least 5 non-empty lines.",
      summary: "Too short to evaluate.",
    };
  }

  // +30 valid heading hierarchy
  const headingLevels = lineArr
    .filter(l => /^#{1,6}\s/.test(l))
    .map(l => l.match(/^(#+)/)[1].length);
  let hierarchyValid = true;
  let hierarchyDetail = null;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      hierarchyValid = false;
      hierarchyDetail = `Heading jumps from H${headingLevels[i - 1]} to H${headingLevels[i]}`;
      break;
    }
  }
  if (hierarchyValid) {
    score += 30;
    checks.push({ passed: true, text: "Valid heading hierarchy" });
  } else {
    checks.push({ passed: false, text: hierarchyDetail });
  }

  // +20 consistent bullet style
  const bulletLines = lineArr.filter(l => /^\s*[-*+]\s/.test(l));
  const bulletStyles = new Set(bulletLines.map(l => l.trim()[0]));
  if (bulletStyles.size <= 1) {
    score += 20;
    checks.push({ passed: true, text: "Consistent bullet style" });
  } else {
    checks.push({ passed: false, text: `Mixed bullet characters: ${[...bulletStyles].join(", ")}` });
  }

  // +20 all code blocks closed
  const fenceCount = (text.match(/^```/gm) || []).length;
  if (fenceCount % 2 === 0) {
    score += 20;
    checks.push({ passed: true, text: "All code blocks closed" });
  } else {
    checks.push({ passed: false, text: `${fenceCount} code fence${fenceCount > 1 ? "s" : ""} — one is unclosed` });
  }

  // +15 list nesting under 3 levels
  const nestingDepths = lineArr
    .filter(l => /^\s+[-*+]/.test(l))
    .map(l => Math.floor((l.match(/^(\s+)/)?.[1].length ?? 0) / 2));
  const maxNesting = nestingDepths.reduce((a, b) => Math.max(a, b), 0);
  if (maxNesting <= 3) {
    score += 15;
    checks.push({ passed: true, text: "List nesting within 3 levels" });
  } else {
    checks.push({ passed: false, text: `List nesting reaches ${maxNesting} levels deep` });
  }

  // +15 no empty sections
  let hasEmptySection = false;
  let emptySectionName = null;
  for (let i = 0; i < lineArr.length - 1; i++) {
    if (/^#{1,6}\s/.test(lineArr[i])) {
      let j = i + 1;
      while (j < lineArr.length && lineArr[j].trim() === "") j++;
      if (j < lineArr.length && /^#{1,6}\s/.test(lineArr[j])) {
        emptySectionName = lineArr[i].replace(/^#+\s*/, "");
        hasEmptySection = true;
        break;
      }
    }
  }
  if (!hasEmptySection) {
    score += 15;
    checks.push({ passed: true, text: "No empty sections" });
  } else {
    checks.push({ passed: false, text: `Section "${emptySectionName}" has no content` });
  }

  const failed = checks.filter(c => !c.passed);
  const improvementMap = {
    "Heading jumps": "Use sequential heading levels — H1 → H2 → H3. Never skip a level.",
    "Mixed bullet": "Replace all * and + with - throughout the file.",
    "code fence": "Close the open code block with a matching ``` on its own line.",
    "nesting reaches": "Flatten nested lists beyond 3 levels into prose or separate sections.",
    "has no content": `Add at least one line of content under "${emptySectionName}", or remove the heading.`,
  };
  const firstFailed = failed[0];
  const improvement = firstFailed
    ? Object.entries(improvementMap).find(([k]) => firstFailed.text.includes(k))?.[1] ?? null
    : null;

  return {
    score: Math.min(100, score),
    checks,
    checkedSummary: "heading hierarchy, bullet style, code block closure, nesting depth, empty sections",
    improvement: score < 100 ? improvement : null,
    summary: failed.length === 0
      ? "No structural issues."
      : `${failed.length} structural problem${failed.length > 1 ? "s" : ""} found.`,
  };
}

// ── Token economics ───────────────────────────────────────────────────────────

function checkTokenEconomics(text) {
  const checks = [];
  let score = 0;
  const tokenCount = estimateTokens(text);
  const wordCount = splitWords(text).length;
  const lineArr = splitLines(text);

  const maxScore = wordCount >= 100 ? 100 : 20;

  // +25 under 500 tokens
  if (tokenCount <= 500) {
    score += 25;
    checks.push({ passed: true, text: `File is ~${tokenCount} tokens — within target` });
  } else if (tokenCount <= 800) {
    checks.push({ passed: false, text: `File is ~${tokenCount} tokens — on the larger side` });
  } else {
    checks.push({ passed: false, text: `File is ~${tokenCount} tokens — very large for a skill file` });
  }

  // +20 preamble under 8 lines
  const instructionVerbs = /^(use|run|call|load|read|write|create|generate|save|return|check|verify|ensure|if|when|do not|never|always|first|then|finally)/i;
  let preambleLines = 0;
  for (const line of lineArr) {
    if (instructionVerbs.test(line.trim())) break;
    if (line.trim().length > 0) preambleLines++;
  }
  if (preambleLines <= 8) {
    score += 20;
    checks.push({ passed: true, text: "Preamble is concise" });
  } else {
    checks.push({ passed: false, text: `Preamble is ${preambleLines} lines before first instruction` });
  }

  // +20 no filler language
  const fillerPatterns = [
    /please\s/i, /make sure to\s/i, /it is important (that|to)\s/i,
    /you should\s/i, /be sure to\s/i, /don't forget to\s/i,
    /note that\s/i, /keep in mind\s/i, /remember to\s/i,
  ];
  const hasFillerLanguage = fillerPatterns.some(p => p.test(text));
  if (!hasFillerLanguage) {
    score += 20;
    checks.push({ passed: true, text: "No filler language" });
  } else {
    checks.push({ passed: false, text: "Filler language found — softens instructions and wastes tokens" });
  }

  // +20 no passive voice
  const passivePattern = /\b(should be|must be|will be|can be|may be|is being|are being|was being|were being)\s+\w+ed\b/i;
  const passiveMatches = (text.match(new RegExp(passivePattern.source, "gi")) || []).length;
  if (passiveMatches <= 2) {
    score += 20;
    checks.push({ passed: true, text: "No passive voice in instructions" });
  } else {
    checks.push({ passed: false, text: `${passiveMatches} passive voice constructions found` });
  }

  // +15 no redundant sentences
  const sentences = text.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 20);
  const seen = new Set();
  let duplicates = 0;
  for (const s of sentences) {
    if (seen.has(s)) duplicates++;
    seen.add(s);
  }
  if (duplicates === 0) {
    score += 15;
    checks.push({ passed: true, text: "No duplicate sentences" });
  } else {
    checks.push({ passed: false, text: `${duplicates} duplicate sentence${duplicates > 1 ? "s" : ""} found` });
  }

  const failed = checks.filter(c => !c.passed);
  const firstFailed = failed[0];
  let improvement = null;
  if (firstFailed) {
    if (firstFailed.text.includes("tokens")) {
      improvement = tokenCount > 800
        ? "Cut to under 500 tokens — remove repeated instructions and any explanation of why rather than what."
        : "Review for redundancy and aim under 400 tokens without losing coverage.";
    } else if (firstFailed.text.includes("Preamble")) {
      improvement = `Move the first ${preambleLines - 5} lines of context to after the first instruction block.`;
    } else if (firstFailed.text.includes("filler")) {
      improvement = "Replace 'please', 'make sure to', 'you should', 'keep in mind' with direct imperative commands.";
    } else if (firstFailed.text.includes("passive")) {
      improvement = "Rewrite passive constructions as active commands — 'the file should be saved' → 'save the file'.";
    } else if (firstFailed.text.includes("duplicate")) {
      improvement = "Find the repeated sentences and remove or merge them — each instruction should appear exactly once.";
    }
  }

  return {
    score: Math.min(maxScore, score),
    checks,
    checkedSummary: "token count, preamble length, filler language, passive voice, duplicate sentences",
    improvement: score < 100 ? improvement : null,
    summary: failed.length === 0
      ? "No token waste detected."
      : `~${Math.round(tokenCount * 0.15)} tokens likely wasted on bloat.`,
  };
}

// ── Discoverability ───────────────────────────────────────────────────────────

function checkDiscoverability(text) {
  const checks = [];
  let score = 0;

  // +40 description field found
  const hasDescription = /^description:/im.test(text) || /^## (description|trigger|when to use)/im.test(text);
  if (hasDescription) {
    score += 40;
    checks.push({ passed: true, text: "Description or trigger field present" });
  } else {
    checks.push({ passed: false, text: "No description or trigger field found" });
  }

  // +25 negative triggers present
  const hasNegativeTrigger = /do not use|never use|not for|except when|don't use|avoid using|skip (this|when)/i.test(text);
  if (hasNegativeTrigger) {
    score += 25;
    checks.push({ passed: true, text: "Negative trigger examples present" });
  } else {
    checks.push({ passed: false, text: "No negative triggers — when NOT to use this skill is undefined" });
  }

  // +20 description over 10 words
  const descMatch = text.match(/description:\s*["']?(.+?)["']?(\n|$)/i);
  if (descMatch && descMatch[1].split(" ").length >= 10) {
    score += 20;
    checks.push({ passed: true, text: "Description is specific enough to trigger reliably" });
  } else if (descMatch) {
    checks.push({ passed: false, text: `Description is only ${descMatch[1].split(" ").length} words — too vague to fire reliably` });
  }

  // +15 imperative verbs found
  const hasImperativeVerbs = /(^|\n)\s*(use |run |call |load |read |write |create |generate |do not |never |always )/im.test(text);
  if (hasImperativeVerbs) {
    score += 15;
    checks.push({ passed: true, text: "Imperative verbs found in instructions" });
  } else {
    checks.push({ passed: false, text: "No imperative verbs — instructions are written passively" });
  }

  const failed = checks.filter(c => !c.passed);
  const firstFailed = failed[0];
  let improvement = null;
  if (firstFailed) {
    if (firstFailed.text.includes("description or trigger")) {
      improvement = "Add a 'description:' frontmatter field that lists at least 3 specific phrases users would say to trigger this skill.";
    } else if (firstFailed.text.includes("negative triggers")) {
      improvement = "Add a 'Do NOT use for...' line with at least 2 explicit exclusions to prevent conflicts with similar skills.";
    } else if (firstFailed.text.includes("words")) {
      improvement = "Expand the description to at least 20 words and include the specific phrases a user would say.";
    } else if (firstFailed.text.includes("imperative")) {
      improvement = "Start instructions with action verbs: Use, Run, Call, Load, Write, Never, Always.";
    }
  }

  return {
    score: Math.min(100, score),
    checks,
    checkedSummary: "description field, negative triggers, description specificity, imperative verbs",
    improvement: score < 100 ? improvement : null,
    summary: failed.length === 0
      ? "Trigger is well-defined."
      : "Trigger has gaps that will cause misfires.",
  };
}

// ── Scope boundaries ──────────────────────────────────────────────────────────

function checkScopeBoundaries(text) {
  const checks = [];
  let score = 0;

  // +40 output specification found
  const hasOutputSpec = /output|return|result|save|write|export|produce|generate/i.test(text);
  if (hasOutputSpec) {
    score += 40;
    checks.push({ passed: true, text: "Output specification present" });
  } else {
    checks.push({ passed: false, text: "No output specification — unclear what Claude should produce" });
  }

  // +35 hard limits present
  const hasHardLimits = /do not|never|must not|will not|cannot|don't|won't/i.test(text);
  if (hasHardLimits) {
    score += 35;
    checks.push({ passed: true, text: "Hard limits defined" });
  } else {
    checks.push({ passed: false, text: "No hard limits — skill has no defined boundaries" });
  }

  // +25 input type mentioned
  const hasInputType = /input|file|path|url|text|string|number|image|pdf|document|argument/i.test(text);
  if (hasInputType) {
    score += 25;
    checks.push({ passed: true, text: "Input type specified" });
  } else {
    checks.push({ passed: false, text: "No input type — skill accepts undefined inputs" });
  }

  const failed = checks.filter(c => !c.passed);
  const firstFailed = failed[0];
  let improvement = null;
  if (firstFailed) {
    if (firstFailed.text.includes("output")) {
      improvement = "Add an '## Output' section specifying the exact format, structure, and location of what Claude should produce.";
    } else if (firstFailed.text.includes("limits")) {
      improvement = "Add a 'Do not...' or '## Limits' section listing what this skill will never do and what inputs it rejects.";
    } else if (firstFailed.text.includes("input")) {
      improvement = "Specify accepted input types — file path, URL, pasted text, or specific format — so the skill knows what to expect.";
    }
  }

  return {
    score: Math.min(100, score),
    checks,
    checkedSummary: "output specification, hard limits, input type",
    improvement: score < 100 ? improvement : null,
    summary: failed.length === 0
      ? "Scope is defined."
      : "Scope isn't defined — inputs, outputs, and limits are missing.",
  };
}

// ── Examples ──────────────────────────────────────────────────────────────────

function checkExamples(text) {
  const checks = [];
  let score = 0;

  // +60 any example found
  const hasExample = /example|e\.g\.|for instance|input:|output:|sample/i.test(text);
  if (hasExample) {
    score += 60;
    checks.push({ passed: true, text: "At least one example present" });
  } else {
    checks.push({ passed: false, text: "No examples — Claude will guess at intended behavior" });
  }

  // +25 negative example found
  const hasNegativeExample = /bad input|wrong|invalid|malformed|not like|do not|incorrect example/i.test(text);
  if (hasNegativeExample) {
    score += 25;
    checks.push({ passed: true, text: "Negative example present" });
  } else {
    checks.push({ passed: false, text: "No negative examples — bad input handling is undefined" });
  }

  // +15 edge case example found
  const hasEdgeCaseExample = /edge case|corner case|edge-case|when.*empty|null|undefined|no file|missing/i.test(text);
  if (hasEdgeCaseExample) {
    score += 15;
    checks.push({ passed: true, text: "Edge case example present" });
  } else {
    checks.push({ passed: false, text: "No edge case examples — failure modes are uncovered" });
  }

  const failed = checks.filter(c => !c.passed);
  const firstFailed = failed[0];
  let improvement = null;
  if (firstFailed) {
    if (firstFailed.text.includes("No examples")) {
      improvement = "Add a concrete input/output example showing real usage — not a trivial or placeholder case.";
    } else if (firstFailed.text.includes("Negative")) {
      improvement = "Add a 'Bad input example' showing what this skill should reject and what it tells the user instead.";
    } else if (firstFailed.text.includes("edge case")) {
      improvement = "Add an edge case: empty input, missing file, unexpected format, or ambiguous request.";
    }
  }

  return {
    score: Math.min(100, score),
    checks,
    checkedSummary: "example presence, negative examples, edge case examples",
    improvement: score < 100 ? improvement : null,
    summary: hasExample
      ? (failed.length === 0 ? "Examples are thorough." : "Has examples but missing coverage.")
      : "No examples — Claude will guess at intended behavior.",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function runStaticAnalysis(text) {
  const words = splitWords(text);
  const lines = splitLines(text);
  const nonEmptyLines = lines.filter(l => l.trim());

  // Minimum content guard — return invalidFile for garbage input
  const hasSkillSignals =
    /^description:/im.test(text) ||
    /^trigger:/im.test(text) ||
    /^## (description|trigger|when to use|overview)/im.test(text) ||
    /(^|\n)\s*(use |run |call |load |read |write |create |generate |do not |never |always )/im.test(text);

  if (words.length < 50 || nonEmptyLines.length < 5 || !hasSkillSignals) {
    return {
      staticScore: 0,
      invalidFile: true,
      invalidReason: "Content is too short or does not look like a skill file.",
      fileStats: {
        lines: lines.length,
        words: words.length,
        token_estimate: estimateTokens(text),
        has_examples: false,
        has_negative_triggers: false,
        has_output_spec: false,
      },
      staticCategories: {},
      heuristicsEvaluated: 22,
      heuristicsRemaining: 53,
      needsLLM: true,
    };
  }

  const structural      = checkStructuralIntegrity(text);
  const tokens          = checkTokenEconomics(text);
  const discoverability = checkDiscoverability(text);
  const scope           = checkScopeBoundaries(text);
  const examples        = checkExamples(text);

  const fileStats = {
    lines:                lines.length,
    words:                words.length,
    token_estimate:       estimateTokens(text),
    has_examples:         /example|e\.g\.|input:|output:/i.test(text),
    has_negative_triggers:/do not use|never use|not for|except when/i.test(text),
    has_output_spec:      /output|returns|produces|saves to|writes to/i.test(text),
  };

  // Weights aligned to LLM evaluation weights for the five categories we check.
  // Divide first, then round — applying Math.round before division amplifies rounding error by ~1.89x.
  const staticScore = (
    structural.score      * 0.08 +
    tokens.score          * 0.10 +
    discoverability.score * 0.15 +
    scope.score           * 0.12 +
    examples.score        * 0.08
  ) / 0.53;

  return {
    staticScore: Math.min(100, Math.round(staticScore)),
    fileStats,
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
