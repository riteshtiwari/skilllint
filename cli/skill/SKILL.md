description: Evaluate a Claude skill file with a full 80-heuristic quality analysis across 10 categories. Use when the user types /skilllint, says "lint my skill", "check this skill file", "evaluate my skill", "score my skill", or provides a path to a .md skill file and wants a quality score. Do NOT use for CLAUDE.md files, README files, code review, or documentation review.

## When to use

Use this skill when:
- User types `/skilllint [path]`
- User says "lint my skill", "check this skill", "score my skill", "what's wrong with my skill file"
- User provides a `.md` file path and asks for skill quality feedback
- User asks "is this a good skill file"

Do NOT use when:
- The file is CLAUDE.md, README.md, or any documentation file
- User wants code review, not skill review
- No path is provided and user is asking a general question about Claude skills

## Step 1 — Get the file

If the user provided a path, read it immediately using the Read tool.

If no path was given, ask once: "Which skill file? Provide the full path — for example: `/Users/you/.claude/skills/my-skill/SKILL.md`"

Do not proceed until you have the file content.

Before reading, apply these two guards:

1. **Output file guard** — if the path ends with `-analysis.md` or `-improved.md`, warn the user: "This looks like a SkillLint output file, not a skill file. Run `/skilllint` on the original skill. Proceed anyway? (yes/no)" Do not evaluate until confirmed.

2. **Relative path note** — if the path does not start with `/`, inform the user that output files will be written relative to Claude Code's current working directory, which may not be the skill file's directory. Ask if they want to provide an absolute path instead.

## Step 2 — Minimum viability check

Before scoring, verify:
- File has at least 50 words
- File has at least one structural signal: a `description:` frontmatter field, a `trigger:` field, a `## When to use` section, or imperative instructions (Use / Run / Call / Never / Always / Do not)

If either fails, respond:

```
Not a valid skill file.

[State which check failed and why]

A skill file needs at minimum:
- A description: field or When to use section
- At least one imperative instruction
- 50+ words of content
```

Do not score an invalid file.

## Step 3 — Full 80-heuristic evaluation

Evaluate the file content in complete isolation. Set aside all prior messages in this conversation — only the file content read in Step 1 applies to this evaluation. Nothing from earlier in the conversation affects the score.

You are SkillLint — a brutally honest evaluator. Do not inflate scores. A mediocre skill file scores 40–55. A good one scores 65–80. Exceptional files score 85+.

Evaluate all 10 categories. For each, identify every heuristic issue present, score honestly, and write one blunt summary sentence.

---

### Scoring scale

| Range | Meaning |
|-------|---------|
| 85–100 | Exceptional. Production-ready. Almost nothing to fix. |
| 65–84 | Good. Minor issues. Usable but improvable. |
| 45–64 | Needs work. Real problems that will cause unpredictable behavior. |
| 25–44 | Failing. Major gaps. Will cause consistent failures. |
| 0–24 | Critical. Start over. |

---

### Category weights

| Category | Weight |
|----------|--------|
| Discoverability | 15% |
| Instruction Quality | 18% |
| Scope & Boundaries | 12% |
| Structural Integrity | 7% |
| Token Economics | 10% |
| Consistency & Conflicts | 10% |
| Robustness | 10% |
| Examples & Evidence | 7% |
| Maintainability | 3% |
| Security | 8% |

---

### Category 1 — Discoverability (15%)

Evaluate:
1. **Trigger Precision** — specific enough to load correctly, not so broad it fires everywhere
2. **Trigger Vocabulary Coverage** — covers how users actually phrase requests, not just one phrasing
3. **Negative Trigger Clarity** — explicitly states when NOT to load
4. **Trigger/Content Alignment** — description matches what the skill actually does
5. **Competing Skill Confusion** — would this trigger at the same time as another common skill
6. **Keyword Redundancy** — repeating the same concept without adding coverage

---

### Category 2 — Instruction Quality (18%)

Evaluate:
7. **Instruction Clarity** — no ambiguous verbs like "handle", "manage", "process" without definition
8. **Sequencing Logic** — steps in the right order, later steps don't assume earlier ones haven't run
9. **Conditional Coverage** — if/when/else logic present for branching scenarios
10. **Imperative Voice Consistency** — instructions written as commands, not suggestions
11. **Implicit Assumption Detection** — instructions assume Claude knows something it may not
12. **Instruction Atomicity** — each instruction does one thing, not three bundled
13. **Action Specificity** — "save the file" vs "save to /path/ as [filename].[ext]"
14. **Tool Citation Accuracy** — tools mentioned by correct name, not generic description
15. **Priority Ordering** — when multiple instructions could apply, which wins, is that stated

---

### Category 3 — Scope & Boundaries (12%)

Evaluate:
16. **Single Responsibility** — one skill, one job
17. **Scope Creep Detection** — handles things outside stated purpose mid-file
18. **Input Type Specification** — what inputs it accepts, what it rejects
19. **Output Contract** — exact output format, type, location, naming convention
20. **Graceful Degradation** — what happens when input is wrong, missing, or malformed
21. **Failure Mode Documentation** — tells Claude what to say when it cannot complete
22. **Hard Limits Stated** — what this skill explicitly will not do

---

### Category 4 — Structural Integrity (7%)

Evaluate:
23. **Markdown Validity** — proper syntax, no broken formatting
24. **Heading Consistency** — logical hierarchy, no skipped heading levels
25. **List Formatting** — consistent bullet style throughout
26. **Code Block Closure** — all opened ``` blocks properly closed
27. **Table Structure** — column counts consistent, headers present where tables are used
28. **Nesting Depth** — lists beyond 3 levels deep are unreliable in context
29. **Section Completeness** — no headings with empty bodies
30. **Logical Flow** — reading top to bottom makes sense, no unexplained jumps

---

### Category 5 — Token Economics (10%)

Evaluate:
31. **File Size** — raw token count (under 500 tokens is ideal; 800+ is a problem)
32. **Instruction Density** — useful signal per line, not padding
33. **Redundancy** — same instruction stated more than once without adding nuance
34. **Preamble Bloat** — lines before first actual instruction (under 8 is acceptable)
35. **Over-explanation** — explaining why instead of what
36. **Example Ratio** — examples illustrate; they don't dominate the file
37. **Filler Language** — "please", "make sure to", "it is important that", "keep in mind"
38. **Passive Voice** — "should be saved" instead of "save"

---

### Category 6 — Consistency & Conflicts (10%)

Evaluate:
39. **Direct Contradiction** — two instructions that produce opposite behavior
40. **Tonal Inconsistency** — formal in one section, casual in another without reason
41. **Terminology Consistency** — same concept called different names in different sections
42. **Format Inconsistency** — output format described differently in examples vs spec
43. **Version Drift** — signs the file was edited multiple times without reconciliation

---

### Category 7 — Robustness (10%)

Evaluate:
44. **Edge Case Coverage** — non-happy-path scenarios addressed
45. **Input Variance Handling** — handles different file types, sizes, encodings
46. **Dependency Fragility** — hardcoded paths, version-specific tool names
47. **Environment Assumptions** — assumes tools are available without checking
48. **Partial Execution Handling** — what if Claude gets halfway and something fails
49. **Idempotency** — running the skill twice, does it break something
50. **Concurrency Awareness** — if relevant, handles multiple simultaneous inputs

---

### Category 8 — Examples & Evidence (7%)

Evaluate:
51. **Example Presence** — at least one concrete input/output example exists
52. **Example Representativeness** — covers real use, not just a trivial case
53. **Example Accuracy** — example output matches what instructions would actually produce
54. **Negative Examples** — shows what bad input looks like and expected behavior
55. **Edge Case Examples** — at least one non-obvious scenario shown

---

### Category 9 — Maintainability (3%)

Evaluate:
56. **Purpose Statement Clarity** — first 3 lines tell you exactly what this skill does
57. **Author Intent Legibility** — a new person can understand design decisions
58. **Change Surface Area** — how many places need updating if one thing changes
59. **Versioning Signals** — any indication of when this was last updated or by whom
60. **Dependency Documentation** — external dependencies listed upfront

---

### Category 10 — Security (8%)

Evaluate:
61. **Destructive Action Gates** — delete/overwrite/drop/truncate/wipe operations require explicit user confirmation; no silent destructive actions
62. **Credential & Secret Hygiene** — passwords, tokens, API keys never echoed or logged; masking instructions present when credentials are handled
63. **Prompt Injection Resistance** — skill that reads external content treats it as literal data, not as instructions that override skill behavior
64. **Least Privilege Enforcement** — accesses only specific named resources, not broad directory trees or wildcard patterns
65. **Irreversibility Documentation** — permanent actions (send email, post to service, delete record) labeled as irreversible and require confirmation
66. **Safe Error State** — when operations fail mid-execution, skill specifies how to restore a safe state
67. **Injection Surface Hardening** — inputs that flow into shell commands, SQL, or code execution are validated or sandboxed
68. **Audit Trail** — destructive or external-communication operations report what was executed so the user can verify
69. **No Overpermission Language** — scope is explicitly bounded; no open-ended access grants
70. **Data Minimization** — PII, credentials, and confidential content not propagated beyond what the task requires

---

### Additional heuristics (factored into relevant categories above)

71. **Platform Specificity** — written for the correct runtime (Claude Code vs claude.ai vs API)
72. **Tool Availability Assumptions** — assumes bash or specific MCPs without stating it
73. **User Context Sensitivity** — aware of what the user may or may not know
74. **Conversation State Awareness** — knows where in a conversation it might be loaded
75. **Multi-turn Awareness** — handles being called once vs multiple times in a session
76. **Best Practice Alignment** — matches patterns from high-performing skill files
77. **Anti-pattern Detection** — common skill file failure patterns present
78. **Complexity vs Value Ratio** — actually needed a skill file, not a one-liner
79. **Reusability Score** — broadly applicable vs hyper-specific to one situation
80. **Composability** — works alongside other skills without triggering conflicts

---

## Step 4 — Compute overall score

```
overall = (
  discoverability     × 0.15 +
  instruction_quality × 0.18 +
  scope_boundaries    × 0.12 +
  structural_integrity× 0.07 +
  token_economics     × 0.10 +
  consistency_conflicts × 0.10 +
  robustness          × 0.10 +
  examples_evidence   × 0.07 +
  maintainability     × 0.03 +
  security            × 0.08
)
```

Round to nearest integer.

---

## Step 5 — Save analysis file

Determine output paths from the input file's location:
- Parent directory: the directory part of the input path. If none, use `./`.
- Basename: the input filename without its extension.
- Analysis file: `{parent}/{basename}-analysis.md`
- Improved file: `{parent}/{basename}-improved.md`

Before writing either file, check if it already exists. If it does, ask: "Output files already exist — overwrite? (yes/no)" Do not overwrite without confirmation.

Write `{basename}-analysis.md` using the Write tool. Do not print this content in chat.

Use this exact format for the analysis file:

```markdown
# SkillLint — [filename]

**Score:** [n]/100 — [EXCEPTIONAL / GOOD / NEEDS WORK / FAILING / CRITICAL]
**Verdict:** [one honest sentence about the file overall]
**Top fix:** [single most impactful change — name the specific line or section]

---

**Lines:** [n] | **Words:** [n] | **Tokens:** ~[n]
**Examples:** yes/no | **Neg triggers:** yes/no | **Output spec:** yes/no

---

## Category Scores

| Category | Weight | Score | Summary |
|----------|--------|-------|---------|
| Discoverability | 15% | [n]/100 | [one line] |
| Instruction Quality | 18% | [n]/100 | [one line] |
| Scope & Boundaries | 12% | [n]/100 | [one line] |
| Structural Integrity | 7% | [n]/100 | [one line] |
| Token Economics | 10% | [n]/100 | [one line] |
| Consistency & Conflicts | 10% | [n]/100 | [one line] |
| Robustness | 10% | [n]/100 | [one line] |
| Examples & Evidence | 7% | [n]/100 | [one line] |
| Maintainability | 3% | [n]/100 | [one line] |
| Security | 8% | [n]/100 | [one line] |

---

## Detailed Findings

### Discoverability — [n]/100

[summary]

**Issue:** [specific problem with enough detail to act on]
**Fix:** [concrete rewrite or action]

[repeat Issue/Fix pairs for each issue; if none: "No issues."]

[repeat for all 10 categories in the order above]

---

[Only include if trigger/description field is weak:]
## Suggested trigger rewrite

[Full replacement description: field value — specific, covers multiple phrasings, includes explicit exclusions]
```

If the Write tool returns an error, print the full analysis in chat instead using the same format above.

---

## Step 6 — Save improved skill file

Apply the fixes from all failing categories to produce an improved version of the original skill file.

Hard constraints — not negotiable:
- Fix only the sections identified as issues in Step 3. Do not rewrite sections that passed.
- Preserve the original skill's purpose, domain, trigger semantics, and all correct instructions verbatim where possible.
- Do not add capabilities, tools, or behaviors the original did not claim.
- Do not add version numbers, timestamps, or author credits.
- Use imperative voice. Remove all filler language. Each instruction does one thing.
- Shorter and precise beats longer and comprehensive — every line costs tokens on every invocation.
- Gate any destructive action with an explicit user confirmation step before execution.
- If the overall score was above 80: the improvements are surgical — expect 5–15 line changes. Do not pad.
- If the overall score was below 30: a near-complete rewrite is appropriate. Preserve only the core domain and purpose.

Write to `{basename}-improved.md` using the Write tool. Do not print the improved content in chat.

If the Write tool returns an error, tell the user which file failed and continue to Step 7.

---

## Step 7 — Reply in chat

After both files are written, reply with exactly this and nothing else:

**skilllint** — `[filename]`

**Score:** [n]/100 — [EXCEPTIONAL / GOOD / NEEDS WORK / FAILING / CRITICAL]
**Verdict:** [one sentence]
**Top fix:** [one sentence naming the specific thing to change]

**Analysis:** `[absolute path to analysis file]`
**Improved:** `[absolute path to improved file]`

*Review the improved file before deploying — verify the trigger and output contract are unchanged.*

Do not add category breakdowns, issue lists, or any other content in the chat response.

---

## Bad input examples

Input: `/skilllint` with no path
Response: Ask for the file path — for example: `/Users/you/.claude/skills/my-skill/SKILL.md`. Do not guess or proceed.

Input: `/skilllint CLAUDE.md` or `/skilllint README.md`
Response: Tell the user this is not a Claude skill file. Ask if they meant a different file.

Input: `/skilllint skill-analysis.md` or `/skilllint skill-improved.md`
Response: Warn that this looks like a SkillLint output file, not a skill file. Ask if they meant to run against the original.

Input: file with fewer than 50 words or no structural signals
Response: Fail minimum viability. State which check failed. Do not produce a scored report.
