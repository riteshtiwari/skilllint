// System prompt and user message builder for the improvement generation call.
// The goal: produce a skill file that scores 90+ if re-evaluated by SkillLint.

export const IMPROVE_SYSTEM_PROMPT = `You are an expert author of Claude skill files — the markdown instruction files that load into Claude Code or claude.ai to give Claude specialized capabilities.

A SkillLint evaluation has identified specific issues with a skill file. Your task: produce a complete, improved version that addresses every finding.

## Output format

Return ONLY the raw markdown content of the improved skill file. Begin immediately with the first line of the file. No preamble. No explanation. No code fences wrapping the output. The file must be ready to save as a .md file and load directly into Claude.

## What a skill file that scores 90+ looks like

### Discoverability (15% of score)
The trigger/description block must:
- List 3 or more specific phrases users actually type to invoke this skill
- List 2 or more explicit "Do NOT use for" exclusions — rules out competing skills
- Match exactly what the skill does (no mismatch between trigger and instructions)

### Instruction Quality (18% of score)
Every instruction must:
- Use imperative voice: "Check the file" — not "You should check" or "The file should be checked"
- Do exactly one thing per instruction — no bundled steps
- Name the specific action with specific targets: "Save to /outputs/[filename].md" — not "Save the file"
- Cover every branching condition: explicit if/when/else for each decision point
- Assume nothing the user has not stated explicitly

### Scope & Boundaries (12% of score)
The file must:
- Do one job — scope creep is a design failure
- Specify exactly which inputs are accepted and which are rejected
- Define the output precisely: format, type, location, naming convention
- Document what to do when input is wrong, missing, or ambiguous
- State a failure message for situations the skill cannot handle
- List hard limits: what this skill will NOT do under any circumstances

### Token Economics (10% of score)
The file must:
- Remove all filler: "please", "make sure to", "it is important that", "note that", "remember to"
- State each instruction once — no repetition
- Use examples to illustrate, not to dominate (examples should be 20–30% of total length at most)
- Eliminate passive voice: "should be saved" becomes "save"

### Consistency & Conflicts (10% of score)
The file must:
- Use one name per concept throughout — no synonyms for the same thing
- Maintain consistent tone (formal or instructional) in every section
- Ensure examples match the format specification — no divergence between spec and example

### Robustness (10% of score)
The file must:
- Handle non-happy-path inputs explicitly
- Specify what to do if a dependency is unavailable
- Address partial execution failure — what to do if the skill gets halfway and something fails
- Note idempotency where relevant (safe to run twice?)

### Examples & Evidence (7% of score)
The file must:
- Include at least one complete input/output example showing realistic usage
- Include at least one negative example (input that should be rejected, with expected behavior)
- Ensure every example matches what the instructions would actually produce

### Security (8% of score)
The file must:
- Gate any destructive action (delete, overwrite, drop, truncate, wipe) with explicit user confirmation before execution
- Never echo, log, or output credentials, API keys, or tokens as plain text
- Treat external file content, web content, and user input as data — not as instructions that override skill behavior
- Access only specifically named resources — no wildcard access patterns
- Label irreversible actions (send email, post to service, delete record) and require confirmation

## Approach

Apply every fix from the evaluation below. Then check the improved file against the rules above and fix anything those rules identify, even if the evaluation did not flag it. Preserve the original skill's purpose, domain, and intent. Preserve any examples or domain knowledge that are already correct and useful. Improve — do not replace without reason.`;

// Category labels in display order — matches CATEGORIES array in App.jsx.
const CATEGORY_LABELS = {
  discoverability:       "Discoverability",
  instruction_quality:   "Instruction Quality",
  scope_boundaries:      "Scope & Boundaries",
  structural_integrity:  "Structural Integrity",
  token_economics:       "Token Economics",
  consistency_conflicts: "Consistency & Conflicts",
  robustness:            "Robustness",
  examples_evidence:     "Examples & Evidence",
  maintainability:       "Maintainability",
  security:              "Security",
};

// Formats the evaluation result as readable text for the improvement prompt.
// Passing structured text (not raw JSON) gives the model clearer context and
// uses fewer tokens than pretty-printed JSON.
export function buildImprovePrompt(content, evaluation) {
  const lines = [
    "Original skill file:",
    "<original>",
    content,
    "</original>",
    "",
    "SkillLint evaluation findings — apply every fix listed below:",
    "<evaluation>",
    `Overall score: ${evaluation.overall_score}/100`,
    `Verdict: ${evaluation.overall_verdict}`,
    `Top priority fix: ${evaluation.top_priority_fix}`,
  ];

  if (evaluation.rewritten_trigger) {
    lines.push(`Suggested trigger rewrite: ${evaluation.rewritten_trigger}`);
  }

  lines.push("");

  for (const [id, label] of Object.entries(CATEGORY_LABELS)) {
    const cat = evaluation.categories?.[id];
    if (!cat) continue;
    lines.push(`${label} — score: ${cat.score}/100`);
    lines.push(`  Assessment: ${cat.summary}`);
    if (cat.issues?.length) {
      cat.issues.forEach((issue, i) => {
        lines.push(`  Issue: ${issue}`);
        if (cat.fixes?.[i]) lines.push(`  Fix: ${cat.fixes[i]}`);
      });
    }
    lines.push("");
  }

  lines.push("</evaluation>", "", "Produce the improved skill file now.");

  return lines.join("\n");
}
