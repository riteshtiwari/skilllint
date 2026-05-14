# SkillLint — Complete Implementation Plan

**Domain:** skilllint.dev  
**Goal:** The go-to tool for Claude skill file quality.  
**Model:** Free static analysis for everyone. Full LLM evaluation with your own Anthropic API key.  
**Status:** App.jsx built and running locally. Moving to Claude Code for productionization.

---

## Table of Contents

1. Product Model
2. Tech Stack
3. Current State
4. Phase 0: Project Setup
5. Phase 1: Static Analysis Engine
6. Phase 2: API Key Management
7. Phase 3: LLM Evaluation (Edge Function)
8. Phase 4: Auth with Clerk
9. Phase 5: Supabase Setup
10. Phase 6: Clerk + Supabase Integration
11. Phase 7: Vercel Deployment
12. Phase 8: Landing Page
13. Phase 9: Error Handling & Rate Limiting
14. Phase 10: Wave 1 Features
15. Phase 11: Wave 2 Features
16. Phase 12: Wave 3 Features
17. System Prompt (Complete)
18. Heuristics Reference
19. Design System
20. File Structure
21. Environment Variables
22. Build Order
23. SQL Reference

---

## 1. Product Model

### Why "Bring Your Own Key"

Running LLM evaluations server-side with your own Anthropic key means you pay for every user's evaluation. At scale that becomes a real cost with no revenue to offset it.

BYOK flips this: you provide the infrastructure and static analysis free, users bring their own key for LLM-powered features. Fair split. No cost to you beyond hosting.

### Tier Split

**Free tier — no account, no key required:**

These run entirely client-side or with cheap server computation. No Anthropic API involved.

| Feature | How it works |
|---|---|
| Markdown validity | Regex + AST parsing |
| Heading hierarchy check | Parse heading levels, detect skips |
| Code block closure | Count opening vs closing fences |
| List formatting consistency | Detect mixed bullet styles |
| Nesting depth warning | Count indent levels |
| File size + token estimate | Character count, divide by 4 |
| Line and word count | String split |
| Preamble bloat | Count lines before first instruction |
| Passive voice detection | Regex pattern list |
| Filler language detection | Keyword list match |
| Redundancy detection | Sentence similarity (string matching) |
| Trigger keyword density | Count specificity signals in description |
| Has examples flag | Look for example/e.g./input/output patterns |
| Has negative triggers flag | Look for "do not", "never", "except" patterns |
| Has output spec flag | Look for output/returns/produces patterns |
| Section completeness | Detect headings with empty bodies |

Score: 0-100 based on these static checks alone. Covers roughly 27 of the 80 heuristics.

**Full tier — account required, Anthropic key required:**

Everything above plus all LLM-evaluated heuristics:

- Implicit assumption detection
- Conflict and contradiction detection  
- Instruction clarity scoring
- Trigger precision and vocabulary coverage
- Scope creep detection
- Graceful degradation evaluation
- Edge case coverage analysis
- Example representativeness and accuracy
- Terminology consistency
- All rewrites and fix suggestions
- Rewritten trigger
- Live simulation
- NL to skill generator
- Failure mode simulator

Score: full 80-heuristic weighted evaluation.

### User Flow

```
Land on skilllint.dev
  ↓
Upload or paste skill file
  ↓
Static analysis runs immediately (no account needed)
  ↓
Show partial score + "X more heuristics need LLM evaluation"
  ↓
CTA: "Add your Anthropic key for full evaluation"
  ↓
User adds key (stored locally in browser, never sent to our servers)
  ↓
Full evaluation runs via client → our Edge Function → Anthropic
  ↓
Full score + all rewrites + simulation
```

---

## 2. Tech Stack

```
Frontend:         Vite + React
Auth:             Clerk (Google + email)
API Proxy:        Vercel Edge Functions
Database:         Supabase (PostgreSQL)
Deployment:       Vercel
Domain:           skilllint.dev
Fonts:            DM Sans + JetBrains Mono (Google Fonts)
Diff library:     diff (npm)
Static analysis:  Custom (no dependencies)
```

---

## 3. Current State (App.jsx)

Already built and working. Do not rebuild these.

- File upload with drag/drop and paste fallback
- 4 views: upload, loading, result, history
- Score arc (SVG, color-coded)
- Full evaluation via Anthropic API (currently client-side — needs to move to Edge Function)
- 10-category breakdown with expandable issue/fix pairs
- Top priority fix callout
- Rewritten trigger suggestion
- File stats row (token estimate, lines, examples, output spec, negative triggers)
- Export to `.md` report
- Local history in localStorage (up to 20 entries — will migrate to Supabase)
- Loading view with animated bars and rotating status messages
- Nav component with consistent buttons across views

**What needs to change in App.jsx:**
1. API call moves from direct Anthropic → `/api/evaluate` Edge Function
2. API key is passed in request header, not hardcoded
3. History moves from localStorage → Supabase
4. Static analysis runs before LLM evaluation and shows partial results
5. Key management UI added

---

## 4. Phase 0: Project Setup

### 4.1 Scaffold

```bash
npm create vite@latest skilllint -- --template react
cd skilllint
npm install
```

Copy existing `App.jsx` into `src/App.jsx`. Run `npm run dev` to confirm it boots.

### 4.2 Install dependencies

```bash
npm install @clerk/clerk-react @supabase/supabase-js diff
npm install -D vercel
```

### 4.3 Environment variables

Create `.env.local` at project root:

```env
# Clerk (public — safe to expose to browser)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase (public — safe to expose, RLS enforces access)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# These NEVER go in .env.local — Vercel dashboard only
# ANTHROPIC_API_KEY — used only in Edge Functions
# CLERK_SECRET_KEY — used only in Edge Functions
```

### 4.4 `.gitignore`

```
.env.local
.env.*.local
node_modules/
dist/
.vercel/
```

### 4.5 `vercel.json`

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization, X-Api-Key" }
      ]
    }
  ]
}
```

---

## 5. Phase 1: Static Analysis Engine

This runs entirely in the browser, no API key needed. Covers roughly 25 heuristics.

### File: `src/lib/staticAnalysis.js`

```javascript
// ─── Helpers ─────────────────────────────────────────────────────────────────

const lines = (text) => text.split('\n');
const words = (text) => text.trim().split(/\s+/).filter(Boolean);

// Rough token estimate: ~4 chars per token
const estimateTokens = (text) => Math.round(text.length / 4);

// ─── Individual checks ────────────────────────────────────────────────────────

function checkMarkdownValidity(text) {
  const issues = [];
  const fixes = [];
  let score = 100;

  // Code block closure
  const fenceCount = (text.match(/^```/gm) || []).length;
  if (fenceCount % 2 !== 0) {
    issues.push("Unclosed code block detected (odd number of ``` fences)");
    fixes.push("Find and close every opening ``` with a matching closing ```");
    score -= 20;
  }

  // Heading hierarchy
  const headings = lines(text)
    .filter(l => l.startsWith('#'))
    .map(l => l.match(/^(#+)/)[1].length);
  
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      issues.push(`Heading hierarchy skips a level (H${headings[i-1]} to H${headings[i]})`);
      fixes.push("Use sequential heading levels: H1 → H2 → H3, never skip");
      score -= 15;
      break;
    }
  }

  // Mixed list styles
  const bulletLines = lines(text).filter(l => /^\s*[-*+]\s/.test(l));
  const styles = new Set(bulletLines.map(l => l.trim()[0]));
  if (styles.size > 1) {
    issues.push("Mixed bullet styles (-, *, +) used in same document");
    fixes.push("Pick one bullet character and use it throughout. Prefer -");
    score -= 10;
  }

  // Deep nesting
  const maxNesting = Math.max(...lines(text)
    .filter(l => /^\s+[-*+]/.test(l))
    .map(l => Math.floor(l.match(/^(\s+)/)?.[1].length / 2) || 0), 0);
  if (maxNesting > 3) {
    issues.push(`List nesting depth is ${maxNesting} levels — too deep to parse reliably`);
    fixes.push("Flatten nested lists beyond 3 levels into prose or separate sections");
    score -= 10;
  }

  // Empty sections (heading followed immediately by another heading)
  const lineArr = lines(text);
  for (let i = 0; i < lineArr.length - 1; i++) {
    if (lineArr[i].startsWith('#') && lineArr[i + 1].startsWith('#')) {
      issues.push(`Section "${lineArr[i].replace(/^#+\s*/, '')}" has no content`);
      fixes.push("Either add content to this section or remove the heading");
      score -= 10;
      break;
    }
  }

  return { score: Math.max(0, score), issues, fixes,
    summary: issues.length === 0 ? "Structure is clean and well-formed." : `${issues.length} structural problem${issues.length > 1 ? 's' : ''} found.` };
}

function checkTokenEconomics(text) {
  const issues = [];
  const fixes = [];
  let score = 100;
  const tokenCount = estimateTokens(text);

  // File size
  if (tokenCount > 800) {
    issues.push(`File is ~${tokenCount} tokens — very large for a skill file`);
    fixes.push("Target under 500 tokens. Cut redundant instructions, verbose explanations, and repeated points");
    score -= 25;
  } else if (tokenCount > 500) {
    issues.push(`File is ~${tokenCount} tokens — on the larger side`);
    fixes.push("Review for redundancy. Aim for under 400 tokens without losing coverage");
    score -= 10;
  }

  // Preamble bloat — how many lines before first instruction verb
  const lineArr = lines(text);
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

  // Filler language
  const fillerPatterns = [
    /please\s/gi, /make sure to\s/gi, /it is important (that|to)\s/gi,
    /you should\s/gi, /be sure to\s/gi, /don't forget to\s/gi,
    /note that\s/gi, /keep in mind\s/gi, /remember to\s/gi
  ];
  const fillerMatches = fillerPatterns.filter(p => p.test(text));
  if (fillerMatches.length > 0) {
    issues.push(`Filler language found: softens instructions and wastes tokens`);
    fixes.push("Remove: 'please', 'make sure to', 'it is important that', 'you should'. Use direct commands instead.");
    score -= 10;
  }

  // Passive voice in instructions
  const passivePattern = /\b(should be|must be|will be|can be|may be|is being|are being|was being|were being|been|being)\s+\w+ed\b/gi;
  const passiveMatches = (text.match(passivePattern) || []).length;
  if (passiveMatches > 2) {
    issues.push(`${passiveMatches} passive voice constructions found in instructions`);
    fixes.push("Rewrite passive instructions as active commands. 'The file should be saved' → 'Save the file to...'");
    score -= 10;
  }

  // Redundancy — repeated sentences (simple check)
  const sentences = text.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 20);
  const seen = new Set();
  let duplicates = 0;
  for (const s of sentences) {
    if (seen.has(s)) duplicates++;
    seen.add(s);
  }
  if (duplicates > 0) {
    issues.push(`${duplicates} near-duplicate instruction${duplicates > 1 ? 's' : ''} found`);
    fixes.push("Remove duplicate instructions. State each instruction exactly once.");
    score -= duplicates * 5;
  }

  return { score: Math.max(0, score), issues, fixes,
    summary: issues.length === 0 ? "Token usage is efficient." : `Wastes ~${Math.round(tokenCount * 0.15)} tokens on bloat.` };
}

function checkDiscoverabilityStatic(text) {
  const issues = [];
  const fixes = [];
  let score = 70; // Start at 70, LLM will refine this

  // Look for description/trigger field
  const hasDescription = /^description:/im.test(text) || /^## (description|trigger|when to use)/im.test(text);
  if (!hasDescription) {
    issues.push("No description or trigger field found");
    fixes.push("Add a 'description:' field in the frontmatter or a '## Description' section that explains exactly when this skill should load");
    score -= 30;
  }

  // Negative triggers
  const hasNegativeTrigger = /do not use|never use|not for|except when|don't use|avoid using|skip (this|when)/i.test(text);
  if (!hasNegativeTrigger) {
    issues.push("No negative trigger examples (when NOT to use this skill)");
    fixes.push("Add explicit exclusions. Example: 'Do NOT use for reading existing PDFs, only for creating new ones'");
    score -= 20;
  }

  // Trigger specificity — very short descriptions are vague
  const descMatch = text.match(/description:\s*["']?(.+?)["']?(\n|$)/i);
  if (descMatch && descMatch[1].split(' ').length < 10) {
    issues.push("Trigger description is very short — likely too vague to fire reliably");
    fixes.push("Expand the description to at least 20 words. Include specific trigger phrases users would actually say.");
    score -= 15;
  }

  return { score: Math.max(0, score), issues, fixes,
    summary: issues.length === 0 ? "Basic trigger signals present." : "Trigger has structural gaps that will cause misfires." };
}

function checkScopeBoundariesStatic(text) {
  const issues = [];
  const fixes = [];
  let score = 70;

  // Output spec
  const hasOutputSpec = /output|return|result|save|write|export|produce|generate/i.test(text);
  if (!hasOutputSpec) {
    issues.push("No output specification found");
    fixes.push("Specify exactly what Claude should produce: file format, location, naming convention, structure");
    score -= 25;
  }

  // Hard limits
  const hasHardLimits = /do not|never|must not|will not|cannot|don't|won't/i.test(text);
  if (!hasHardLimits) {
    issues.push("No hard limits defined");
    fixes.push("Add explicit limits: what this skill will not do, what inputs it rejects, what actions it will never take");
    score -= 15;
  }

  return { score: Math.max(0, score), issues, fixes,
    summary: issues.length === 0 ? "Basic scope signals present." : "Scope boundaries are underspecified." };
}

function checkExamplesStatic(text) {
  const issues = [];
  const fixes = [];
  let score = 50;

  const hasExample = /example|e\.g\.|for instance|input:|output:|sample/i.test(text);
  if (!hasExample) {
    issues.push("No examples found");
    fixes.push("Add at least one concrete input/output example. Show real usage, not a trivial case.");
    score = 20;
  } else {
    score = 75;
  }

  const hasNegativeExample = /bad input|wrong|invalid|malformed|not like|do not|incorrect example/i.test(text);
  if (!hasNegativeExample) {
    issues.push("No negative examples (what bad input looks like)");
    fixes.push("Show at least one example of input this skill should reject or handle gracefully");
    score -= 15;
  }

  return { score: Math.max(0, score), issues, fixes,
    summary: hasExample ? "Has examples but missing edge case coverage." : "No examples at all — Claude will guess at intended behavior." };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function runStaticAnalysis(text) {
  const structural = checkMarkdownValidity(text);
  const tokens = checkTokenEconomics(text);
  const discoverability = checkDiscoverabilityStatic(text);
  const scope = checkScopeBoundariesStatic(text);
  const examples = checkExamplesStatic(text);

  const fileStats = {
    lines: lines(text).length,
    words: words(text).length,
    token_estimate: estimateTokens(text),
    has_examples: /example|e\.g\.|input:|output:/i.test(text),
    has_negative_triggers: /do not use|never use|not for|except when/i.test(text),
    has_output_spec: /output|returns|produces|saves to|writes to/i.test(text),
  };

  // Weighted static score
  // Only scoring categories we can evaluate statically
  const staticScore = Math.round(
    structural.score * 0.15 +
    tokens.score * 0.20 +
    discoverability.score * 0.25 +
    scope.score * 0.25 +
    examples.score * 0.15
  );

  return {
    staticScore,
    fileStats,
    staticCategories: {
      structural_integrity: structural,
      token_economics: tokens,
      discoverability_partial: discoverability,
      scope_boundaries_partial: scope,
      examples_partial: examples,
    },
    heuristicsEvaluated: 27,     // of 80
    heuristicsRemaining: 53,     // need LLM
    needsLLM: true,
  };
}
```

---

## 6. Phase 2: API Key Management

The user's Anthropic key is stored in localStorage. It never leaves the browser except when passed as a header to our Edge Function, which forwards it to Anthropic. We never log it, store it, or touch it server-side beyond forwarding.

### File: `src/lib/keyManager.js`

```javascript
const KEY_STORAGE = "skilllint_api_key";

export const keyManager = {
  get: () => localStorage.getItem(KEY_STORAGE) || "",
  set: (key) => localStorage.setItem(KEY_STORAGE, key),
  clear: () => localStorage.removeItem(KEY_STORAGE),
  isValid: () => {
    const key = localStorage.getItem(KEY_STORAGE);
    return key && key.startsWith("sk-ant-");
  }
};
```

### Key input component

```jsx
// src/components/KeyInput.jsx
import { useState } from "react";
import { keyManager } from "../lib/keyManager";

export function KeyInput({ onKeySet }) {
  const [val, setVal] = useState("");
  const [saved, setSaved] = useState(keyManager.isValid());

  const save = () => {
    if (!val.startsWith("sk-ant-")) return;
    keyManager.set(val);
    setSaved(true);
    onKeySet?.();
  };

  const clear = () => {
    keyManager.clear();
    setVal("");
    setSaved(false);
  };

  if (saved) return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px",
      padding: "12px 16px", background: "#090c09",
      border: "1px solid #1a2a1a", borderRadius: "6px" }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", color: "#4ade80" }}>
        ✓ API key set
      </span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#555" }}>
        sk-ant-...{keyManager.get().slice(-4)}
      </span>
      <button onClick={clear} style={{
        marginLeft: "auto", background: "none", border: "none",
        color: "#555", cursor: "pointer", fontSize: "11px",
        fontFamily: "'JetBrains Mono',monospace"
      }}>CLEAR</button>
    </div>
  );

  return (
    <div style={{ padding: "16px", background: "#0a0a0a",
      border: "1px solid #1a1a1a", borderRadius: "6px" }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px",
        color: "#666", letterSpacing: ".1em", marginBottom: "8px" }}>
        ANTHROPIC API KEY — stored locally, never sent to our servers
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="password"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="sk-ant-..."
          style={{
            flex: 1, background: "#080808", border: "1px solid #1a1a1a",
            borderRadius: "4px", padding: "9px 12px", color: "#ccc",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "12px", outline: "none"
          }}
        />
        <button onClick={save} disabled={!val.startsWith("sk-ant-")} style={{
          background: val.startsWith("sk-ant-") ? "#e8e8e8" : "#111",
          color: val.startsWith("sk-ant-") ? "#080808" : "#333",
          border: "none", borderRadius: "4px", padding: "9px 16px",
          fontFamily: "'JetBrains Mono',monospace", fontSize: "11px",
          cursor: val.startsWith("sk-ant-") ? "pointer" : "default"
        }}>SAVE</button>
      </div>
      <div style={{ marginTop: "8px", fontFamily: "'JetBrains Mono',monospace",
        fontSize: "9px", color: "#444", lineHeight: 1.6 }}>
        Get your key at console.anthropic.com. Without a key you get static analysis only.
      </div>
    </div>
  );
}
```

---

## 7. Phase 3: LLM Evaluation (Edge Function)

### File: `api/evaluate.js`

```javascript
export const config = { runtime: "edge" };

import { SYSTEM_PROMPT } from "../src/constants/prompts.js";

export default async function handler(req) {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Get user's API key from header
  const userKey = req.headers.get("X-Api-Key");

  if (!userKey || !userKey.startsWith("sk-ant-")) {
    return new Response(JSON.stringify({ error: "Valid Anthropic API key required" }), { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { content } = body;

  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: "No content provided" }), { status: 400 });
  }

  if (content.length > 50000) {
    return new Response(JSON.stringify({ error: "File too large. Maximum 50,000 characters." }), { status: 400 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": userKey,            // forward user's key, not ours
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Evaluate this skill file:\n\n${content}` }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      // Surface specific Anthropic errors to user
      if (err.error?.type === "authentication_error") {
        return new Response(JSON.stringify({ error: "Invalid API key. Check your key at console.anthropic.com" }), { status: 401 });
      }
      if (err.error?.type === "rate_limit_error") {
        return new Response(JSON.stringify({ error: "Rate limit hit. Wait a moment and try again." }), { status: 429 });
      }
      if (err.error?.type === "overloaded_error") {
        return new Response(JSON.stringify({ error: "Anthropic API is overloaded. Try again in a few seconds." }), { status: 503 });
      }
      return new Response(JSON.stringify({ error: "Anthropic API error", detail: err.error?.message }), { status: 500 });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "";

    // Strip any markdown fences if model added them
    const clean = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse evaluation response. Try again." }), { status: 500 });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Evaluation failed", detail: err.message }), { status: 500 });
  }
}
```

### File: `api/simulate.js`

```javascript
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const userKey = req.headers.get("X-Api-Key");
  if (!userKey?.startsWith("sk-ant-")) {
    return new Response(JSON.stringify({ error: "API key required" }), { status: 401 });
  }

  const { skillContent, userMessage } = await req.json();

  const prompt = `You have this skill file loaded:

---SKILL FILE---
${skillContent}
---END SKILL FILE---

A user sent this message: "${userMessage}"

Evaluate and respond with JSON only:
{
  "triggers": true,
  "trigger_reason": "why this skill does or does not apply",
  "simulated_response": "exactly how Claude would respond following this skill",
  "gaps": ["specific gap 1", "specific gap 2"],
  "ambiguities": ["point where skill was unclear"],
  "confidence": "HIGH | MEDIUM | LOW",
  "confidence_reason": "why"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": userKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const clean = data.content?.[0]?.text?.replace(/```json|```/g, "").trim();

  try {
    return new Response(JSON.stringify(JSON.parse(clean)), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Simulation failed" }), { status: 500 });
  }
}
```

### File: `api/generate.js`

```javascript
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const userKey = req.headers.get("X-Api-Key");
  if (!userKey?.startsWith("sk-ant-")) {
    return new Response(JSON.stringify({ error: "API key required" }), { status: 401 });
  }

  const { description } = await req.json();

  const prompt = `Generate a complete, high-quality Claude skill file based on this description:

"${description}"

Requirements:
- Frontmatter with name and description fields
- Description field has 3+ specific trigger phrases and 2+ explicit exclusions
- Sequential numbered instructions in imperative voice
- No filler language (no "please", "make sure to", "it is important")
- Explicit output specification (format, location, naming)
- At least one concrete input/output example
- Failure mode handling
- Hard limits section
- Under 450 tokens total

Return ONLY the raw markdown. No explanation. No preamble.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": userKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const skillContent = data.content?.[0]?.text?.trim();

  return new Response(JSON.stringify({ content: skillContent }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

### File: `api/badge/[id].js`

```javascript
export const config = { runtime: "edge" };

import { createClient } from "@supabase/supabase-js";

export default async function handler(req) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY  // service key for server-side reads
  );

  const { data } = await supabase
    .from("evaluations")
    .select("score")
    .eq("id", id)
    .eq("badge_enabled", true)
    .single();

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const score = data.score;
  const color = score >= 80 ? "4ade80" : score >= 60 ? "fbbf24" : score >= 40 ? "fb923c" : "f87171";
  const label = score >= 85 ? "exceptional" : score >= 65 ? "good" : score >= 45 ? "needs work" : "failing";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20">
    <rect width="96" height="20" fill="#111"/>
    <rect x="96" width="64" height="20" fill="#${color}"/>
    <text x="48" y="14" fill="#ccc" font-size="11" font-family="monospace" text-anchor="middle">SkillLint</text>
    <text x="128" y="14" fill="#080808" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">${score} · ${label}</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "s-maxage=3600",
    },
  });
}
```

---

## 8. Phase 4: Auth with Clerk

### Why Clerk over alternatives

- Google + email out of the box
- React SDK is clean, minimal boilerplate
- Free tier handles early growth
- JWT integration with Supabase is documented and straightforward
- No self-hosting, no managing sessions

### 8.1 Wrap app in Clerk provider

`src/main.jsx`:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root")).render(
  <ClerkProvider publishableKey={CLERK_KEY}>
    <App />
  </ClerkProvider>
);
```

### 8.2 Auth-aware app shell

In `App.jsx`, split signed-in vs signed-out state:

```jsx
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import LandingView from "./views/LandingView";

// Inside the component return:
<>
  <SignedOut>
    <LandingView />
  </SignedOut>
  <SignedIn>
    {/* existing app views */}
  </SignedIn>
</>
```

### 8.3 Get auth token for API calls

```jsx
import { useAuth } from "@clerk/clerk-react";

const { getToken } = useAuth();

// When calling evaluate:
const token = await getToken({ template: "supabase" }); // supabase JWT template

const res = await fetch("/api/evaluate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "X-Api-Key": keyManager.get(),
  },
  body: JSON.stringify({ content }),
});
```

Note: The `Authorization` header carries the Clerk JWT for identifying the user server-side. The `X-Api-Key` header carries the Anthropic key for billing.

---

## 9. Phase 5: Supabase Setup

### 9.1 Full schema

Run this in Supabase SQL editor:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Organizations ────────────────────────────────────────────────────────────

create table organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  created_by text not null,          -- Clerk user ID
  created_at timestamptz default now()
);

-- ─── Org members ─────────────────────────────────────────────────────────────

create table org_members (
  org_id uuid references organizations(id) on delete cascade,
  user_id text not null,             -- Clerk user ID
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (org_id, user_id)
);

-- ─── Evaluations ─────────────────────────────────────────────────────────────

create table evaluations (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,             -- Clerk user ID
  org_id uuid references organizations(id),
  filename text,
  skill_slug text,                   -- user-defined name for grouping versions
  version integer default 1,
  score integer,
  static_score integer,              -- score from static analysis only
  result jsonb,                      -- full LLM evaluation JSON
  static_result jsonb,               -- static analysis result JSON
  badge_enabled boolean default false,
  is_shared boolean default false,   -- visible to org members
  created_at timestamptz default now()
);

create index on evaluations(user_id, created_at desc);
create index on evaluations(org_id, created_at desc);
create index on evaluations(skill_slug, user_id, version);

-- ─── Registry ─────────────────────────────────────────────────────────────────

create table registry (
  id uuid default gen_random_uuid() primary key,
  evaluation_id uuid references evaluations(id),
  user_id text not null,
  title text not null,
  description text,
  skill_type text check (skill_type in (
    'file-processing', 'api-integration', 'document-generation',
    'data-analysis', 'code-generation', 'search-retrieval', 'other'
  )),
  content text not null,
  score integer not null,
  forked_from uuid references registry(id),
  downloads integer default 0,
  forks integer default 0,
  published_at timestamptz default now()
);

create index on registry(score desc);
create index on registry(skill_type, score desc);
create index on registry(downloads desc);

-- ─── Benchmark corpus ─────────────────────────────────────────────────────────

create table benchmark_stats (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  p10 integer, p25 integer, p50 integer, p75 integer, p90 integer,
  sample_size integer default 0,
  updated_at timestamptz default now()
);

-- Seed with initial estimates (update as real data accumulates)
insert into benchmark_stats (category, p10, p25, p50, p75, p90, sample_size) values
  ('discoverability',       20, 35, 52, 68, 80, 0),
  ('instruction_quality',   25, 38, 55, 70, 82, 0),
  ('scope_boundaries',      20, 33, 50, 65, 78, 0),
  ('structural_integrity',  40, 55, 70, 82, 92, 0),
  ('token_economics',       30, 45, 60, 74, 85, 0),
  ('consistency_conflicts', 35, 50, 65, 78, 88, 0),
  ('robustness',            15, 28, 45, 62, 75, 0),
  ('examples_evidence',     10, 22, 40, 60, 75, 0),
  ('maintainability',       30, 45, 60, 72, 82, 0),
  ('security',              50, 65, 78, 88, 95, 0);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table evaluations enable row level security;
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table registry enable row level security;

-- Users access their own evaluations
create policy "own evaluations"
  on evaluations for all
  using (user_id = auth.jwt() ->> 'sub');

-- Users access shared evaluations in their orgs
create policy "org shared evaluations"
  on evaluations for select
  using (
    is_shared = true and
    org_id in (
      select org_id from org_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

-- Registry is public for reads, authenticated for writes
create policy "registry public read"
  on registry for select
  using (true);

create policy "registry authenticated write"
  on registry for insert
  using (auth.jwt() ->> 'sub' is not null)
  with check (
    user_id = auth.jwt() ->> 'sub' and
    score >= 80  -- enforce quality floor at DB level
  );

-- Org visibility
create policy "own org"
  on organizations for all
  using (created_by = auth.jwt() ->> 'sub');

create policy "org member read"
  on organizations for select
  using (id in (
    select org_id from org_members
    where user_id = auth.jwt() ->> 'sub'
  ));

create policy "own membership"
  on org_members for all
  using (user_id = auth.jwt() ->> 'sub');
```

### 9.2 Supabase client

`src/lib/supabase.js`:

```javascript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Call this after getting Clerk JWT to authenticate Supabase requests
export const setSupabaseToken = (token) => {
  supabase.realtime.setAuth(token);
  // For queries, pass token in individual calls
};
```

### 9.3 History helpers

`src/lib/history.js`:

```javascript
import { supabase } from "./supabase";

export async function saveEvaluation({ userId, clerkToken, filename, skillSlug, version, score, staticScore, result, staticResult }) {
  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      user_id: userId,
      filename,
      skill_slug: skillSlug,
      version,
      score,
      static_score: staticScore,
      result,
      static_result: staticResult,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function loadHistory(userId, limit = 50) {
  const { data, error } = await supabase
    .from("evaluations")
    .select("id, filename, skill_slug, version, score, static_score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function loadVersions(userId, skillSlug) {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .eq("user_id", userId)
    .eq("skill_slug", skillSlug)
    .order("version", { ascending: true });

  if (error) throw error;
  return data;
}

export async function loadEvaluation(id) {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
```

---

## 10. Phase 6: Clerk + Supabase Integration

Supabase RLS needs to know who the Clerk user is. This is done via a custom JWT template in Clerk that Supabase can verify.

### 10.1 Clerk JWT template

In Clerk dashboard, go to JWT Templates → New template → Supabase.

Set the token claims:
```json
{
  "sub": "{{user.id}}",
  "role": "authenticated",
  "email": "{{user.primary_email_address}}"
}
```

The signing key must match what Supabase expects. In Supabase dashboard → Settings → API → JWT Secret, copy the secret. In Clerk, use this secret to sign the Supabase template.

### 10.2 Using the token in queries

```javascript
import { useSession } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";

export function useSupabaseClient() {
  const { session } = useSession();

  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await session?.getToken({ template: "supabase" });
          const headers = new Headers(options?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...options, headers });
        },
      },
    }
  );
}
```

Use `useSupabaseClient()` hook anywhere you need authenticated Supabase queries. RLS policies then use `auth.jwt() ->> 'sub'` to identify the user.

---

## 11. Phase 7: Vercel Deployment

### 11.1 Initial deploy

```bash
npx vercel
```

Follow prompts. Link to your Vercel account and project.

### 11.2 Environment variables

Set these in Vercel dashboard → Project → Settings → Environment Variables:

| Variable | Value | Environments |
|---|---|---|
| `ANTHROPIC_API_KEY` | Your key | Production, Preview |
| `CLERK_SECRET_KEY` | From Clerk dashboard | Production, Preview |
| `VITE_CLERK_PUBLISHABLE_KEY` | From Clerk dashboard | All |
| `VITE_SUPABASE_URL` | From Supabase dashboard | All |
| `VITE_SUPABASE_ANON_KEY` | From Supabase dashboard | All |
| `SUPABASE_URL` | Same as above | Production, Preview |
| `SUPABASE_SERVICE_KEY` | From Supabase, service role key | Production, Preview |

Note: `SUPABASE_SERVICE_KEY` is only used in Edge Functions (badge endpoint) that need to bypass RLS for server-side reads. Never expose it client-side.

### 11.3 Custom domain

In Vercel dashboard → Project → Settings → Domains, add `skilllint.dev`.

Point DNS:
- If using Vercel nameservers: update at your registrar
- If keeping existing DNS: add `A` record pointing to `76.76.21.21`

SSL is automatic via Let's Encrypt.

### 11.4 Production deploy

```bash
npx vercel --prod
```

---

## 12. Phase 8: Landing Page

Shown to signed-out users. Communicates value clearly. No fluff.

### File: `src/views/LandingView.jsx`

```jsx
import { SignInButton } from "@clerk/clerk-react";

export default function LandingView() {
  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e0e0e0", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: "56px", borderBottom: "1px solid #111" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "22px", height: "22px", border: "1.5px solid #ccc",
            display: "grid", placeItems: "center",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", fontWeight: "700", color: "#ccc" }}>SL</div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".08em", color: "#aaa" }}>
            skilllint<span style={{ color: "#2a2a2a" }}>.dev</span>
          </span>
        </div>
        <SignInButton mode="modal">
          <button style={{ background: "#e8e8e8", color: "#080808", border: "none",
            borderRadius: "4px", padding: "8px 20px", cursor: "pointer",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", letterSpacing: ".08em",
            fontWeight: "600" }}>SIGN IN →</button>
        </SignInButton>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "100px 48px 80px" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px",
          color: "#333", letterSpacing: ".2em", marginBottom: "24px" }}>
          SKILL FILE QUALITY · 80 HEURISTICS · 10 CATEGORIES
        </div>
        <h1 style={{ fontSize: "56px", fontWeight: "300", lineHeight: 1.06,
          margin: "0 0 28px", letterSpacing: "-.03em", color: "#efefef" }}>
          Your skill files are<br />
          <em style={{ fontStyle: "italic", color: "#444" }}>probably broken.</em>
        </h1>
        <p style={{ fontSize: "16px", color: "#777", maxWidth: "480px",
          lineHeight: 1.8, margin: "0 0 40px", fontWeight: "300" }}>
          Skill files are written everywhere with no quality bar. Bad ones silently degrade Claude.
          SkillLint scores every dimension and gives you specific rewrites for everything that fails.
        </p>

        <SignInButton mode="modal">
          <button style={{ background: "#e8e8e8", color: "#080808", border: "none",
            borderRadius: "6px", padding: "16px 36px", cursor: "pointer",
            fontFamily: "'JetBrains Mono',monospace", fontSize: "12px",
            letterSpacing: ".1em", fontWeight: "600" }}>START FOR FREE →</button>
        </SignInButton>
        <div style={{ marginTop: "12px", fontFamily: "'JetBrains Mono',monospace",
          fontSize: "9px", color: "#333" }}>
          Static analysis free. Full evaluation requires Anthropic API key.
        </div>
      </div>

      {/* What you get */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px" }}>
          {[
            { label: "Free — no key needed", items: ["Markdown structure check", "Token estimate", "Preamble bloat detection", "Filler language scan", "Redundancy detection", "File stats"] },
            { label: "Full — with Anthropic key", items: ["All 80 heuristics scored", "Conflict detection", "Trigger precision analysis", "Specific rewrites for every issue", "Live simulation", "Skill generator"] },
          ].map((col, i) => (
            <div key={i} style={{ padding: "24px", background: i === 0 ? "#0a0a0a" : "#0c0c0a",
              border: "1px solid #141414" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px",
                color: i === 0 ? "#666" : "#4ade80", letterSpacing: ".12em", marginBottom: "16px" }}>
                {col.label.toUpperCase()}
              </div>
              {col.items.map(item => (
                <div key={item} style={{ fontSize: "13px", color: "#888",
                  padding: "5px 0", borderBottom: "1px solid #111", lineHeight: 1.5 }}>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 13. Phase 9: Error Handling & Rate Limiting

### 13.1 Client-side error states

All error states need UI. Not just console logs.

```javascript
// src/lib/errors.js

export const ERROR_MESSAGES = {
  "Invalid API key": "Your Anthropic key is invalid. Check it at console.anthropic.com.",
  "Rate limit": "You've hit Anthropic's rate limit. Wait 60 seconds and try again.",
  "overloaded": "Anthropic API is busy. Try again in a few seconds.",
  "File too large": "File exceeds 50,000 characters. Trim the content and retry.",
  "No content": "File appears empty. Check the content and try again.",
  "parse": "Evaluation returned unexpected format. Try again.",
  "network": "Connection failed. Check your internet and try again.",
  "401": "Authentication failed. Try signing out and back in.",
};

export function parseError(err) {
  const msg = err?.message || err?.error || String(err);
  for (const [key, human] of Object.entries(ERROR_MESSAGES)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return human;
  }
  return "Something went wrong. Try again.";
}
```

### 13.2 Rate limiting on Edge Functions

Prevent abuse without a paid rate limiting service. Simple in-memory approach per Edge Function instance:

```javascript
// api/_rateLimit.js
const requests = new Map();

export function rateLimit(ip, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  const userRequests = (requests.get(ip) || [])
    .filter(t => t > windowStart);

  if (userRequests.length >= limit) {
    return { limited: true, retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000) };
  }

  userRequests.push(now);
  requests.set(ip, userRequests);
  return { limited: false };
}
```

Use in `api/evaluate.js`:

```javascript
const ip = req.headers.get("x-forwarded-for") || "unknown";
const { limited, retryAfter } = rateLimit(ip, 20, 60000); // 20 per minute

if (limited) {
  return new Response(
    JSON.stringify({ error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` }),
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
```

### 13.3 Large file handling

```javascript
// Before calling evaluate, check size
const MAX_CHARS = 50000;
const MAX_TOKENS_ESTIMATE = 12500;

if (content.length > MAX_CHARS) {
  setError(`File is too large (${Math.round(content.length / 1000)}K chars). Maximum is 50K chars (~12,500 tokens).`);
  return;
}
```

### 13.4 Retry logic

```javascript
async function evaluateWithRetry(content, apiKey, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({ content }),
      });

      if (res.status === 503 || res.status === 429) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
      }

      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
```

---

## 14. Phase 10: Wave 1 Features

### Feature A: Side-by-Side Diff View

Shows original section vs rewritten version, line by line.

```jsx
// src/components/DiffView.jsx
import { diffLines } from "diff";

export function DiffView({ original, rewritten, title }) {
  const changes = diffLines(original || "", rewritten || "");

  return (
    <div style={{ borderRadius: "6px", overflow: "hidden", marginTop: "12px" }}>
      {title && (
        <div style={{ padding: "8px 14px", background: "#0d0d0d",
          borderBottom: "1px solid #111",
          fontFamily: "'JetBrains Mono',monospace", fontSize: "9px",
          color: "#555", letterSpacing: ".1em" }}>
          {title.toUpperCase()}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px" }}>
        <div style={{ background: "#0d0808", padding: "12px" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px",
            color: "#f87171", letterSpacing: ".1em", marginBottom: "8px" }}>ORIGINAL</div>
          {changes.map((part, i) => !part.added && (
            <div key={i} style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: "11px",
              color: part.removed ? "#f87171" : "#555",
              background: part.removed ? "rgba(248,113,113,0.08)" : "transparent",
              padding: "1px 4px", lineHeight: 1.7,
              borderLeft: part.removed ? "2px solid #f87171" : "2px solid transparent"
            }}>{part.value}</div>
          ))}
        </div>
        <div style={{ background: "#080d08", padding: "12px", borderLeft: "1px solid #111" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px",
            color: "#4ade80", letterSpacing: ".1em", marginBottom: "8px" }}>REWRITTEN</div>
          {changes.map((part, i) => !part.removed && (
            <div key={i} style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: "11px",
              color: part.added ? "#4ade80" : "#555",
              background: part.added ? "rgba(74,222,128,0.08)" : "transparent",
              padding: "1px 4px", lineHeight: 1.7,
              borderLeft: part.added ? "2px solid #4ade80" : "2px solid transparent"
            }}>{part.value}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Trigger from the rewritten trigger section and any issue fix that contains a full rewrite.

---

### Feature B: Skill Versioning

Group evaluations of the same skill file by `skill_slug`. Track score over versions.

**Score sparkline:**

```jsx
// src/components/ScoreSparkline.jsx
export function ScoreSparkline({ scores, width = 100, height = 28 }) {
  if (scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * width;
    const y = height - ((s - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const lastScore = scores[scores.length - 1];
  const firstScore = scores[0];
  const trending = lastScore >= firstScore;

  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none"
        stroke={trending ? "#4ade80" : "#f87171"} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

**Version UI in history view:**

Group history by `skill_slug`. Show version count and sparkline per group. Click to expand and see individual versions. "Compare v1 vs v3" button that opens diff.

---

### Feature C: Live Simulation

Add a "Simulate" tab to the result view. Only available when key is set.

```jsx
// src/components/SimulationPanel.jsx
import { useState } from "react";
import { keyManager } from "../lib/keyManager";

export function SimulationPanel({ skillContent }) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const simulate = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": keyManager.get(),
        },
        body: JSON.stringify({ skillContent, userMessage: message }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "32px" }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px",
        color: "#555", letterSpacing: ".15em", marginBottom: "16px" }}>
        LIVE SIMULATION
      </div>

      <div style={{ marginBottom: "12px" }}>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Type a message a user might send..."
          style={{ width: "100%", height: "80px", background: "#0a0a0a",
            border: "1px solid #141414", borderRadius: "6px", padding: "12px",
            color: "#ccc", fontFamily: "'DM Sans',sans-serif", fontSize: "13px",
            resize: "none", outline: "none", boxSizing: "border-box" }} />
      </div>

      <button onClick={simulate} disabled={!message.trim() || loading || !keyManager.isValid()}
        style={{ background: message.trim() && keyManager.isValid() ? "#e8e8e8" : "#111",
          color: message.trim() && keyManager.isValid() ? "#080808" : "#333",
          border: "none", borderRadius: "4px", padding: "10px 20px",
          fontFamily: "'JetBrains Mono',monospace", fontSize: "10px",
          letterSpacing: ".08em", cursor: "pointer" }}>
        {loading ? "SIMULATING..." : "RUN SIMULATION →"}
      </button>

      {result && !result.error && (
        <div style={{ marginTop: "20px" }}>
          {/* Trigger decision */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px", background: "#0a0a0a",
            border: `1px solid ${result.triggers ? "#1a2a1a" : "#2a1a1a"}`,
            borderLeft: `3px solid ${result.triggers ? "#4ade80" : "#f87171"}`,
            borderRadius: "6px", marginBottom: "12px" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "12px",
              color: result.triggers ? "#4ade80" : "#f87171", fontWeight: "600" }}>
              {result.triggers ? "✓ TRIGGERS" : "✗ DOES NOT TRIGGER"}
            </span>
            <span style={{ fontSize: "12px", color: "#777" }}>{result.trigger_reason}</span>
          </div>

          {/* Simulated response */}
          {result.triggers && (
            <div style={{ padding: "16px", background: "#0a0a0a",
              border: "1px solid #141414", borderRadius: "6px", marginBottom: "12px" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px",
                color: "#555", letterSpacing: ".1em", marginBottom: "8px" }}>
                SIMULATED RESPONSE
              </div>
              <div style={{ fontSize: "13px", color: "#bbb", lineHeight: 1.7,
                whiteSpace: "pre-wrap" }}>{result.simulated_response}</div>
            </div>
          )}

          {/* Gaps */}
          {result.gaps?.length > 0 && (
            <div style={{ padding: "14px 16px", background: "#0c0a08",
              border: "1px solid #2a1a08", borderRadius: "6px" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px",
                color: "#fbbf24", letterSpacing: ".1em", marginBottom: "8px" }}>GAPS FOUND</div>
              {result.gaps.map((g, i) => (
                <div key={i} style={{ fontSize: "12px", color: "#999",
                  padding: "4px 0", borderBottom: "1px solid #1a1208" }}>{g}</div>
              ))}
            </div>
          )}

          {/* Confidence */}
          <div style={{ marginTop: "10px", fontFamily: "'JetBrains Mono',monospace",
            fontSize: "9px", color: "#555" }}>
            CONFIDENCE: <span style={{ color: result.confidence === "HIGH" ? "#4ade80" : result.confidence === "MEDIUM" ? "#fbbf24" : "#f87171" }}>
              {result.confidence}
            </span> — {result.confidence_reason}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 15. Phase 11: Wave 2 Features

### Feature D: Team Library

**Invite flow:**

1. Owner creates org in settings
2. Gets shareable invite link: `skilllint.dev/join/[orgSlug]`
3. New member visits link, signs in, auto-joins org
4. Owner sees member in team view

**Team view shows:**
- All shared skill files across org sorted by score
- Owner name on each
- Color-coded score
- Flag for review button (adds a flag column to evaluations table)
- Click to view full evaluation

**Invite link handler route:** `/join/:slug` → look up org by slug → add current user to `org_members` → redirect to team view

---

### Feature E: Benchmark Percentiles

Show percentile next to each category score.

```javascript
// src/lib/benchmark.js
import { supabase } from "./supabase";

export async function fetchBenchmarks() {
  const { data } = await supabase.from("benchmark_stats").select("*");
  return data || [];
}

export function getPercentile(benchmarks, category, score) {
  const bench = benchmarks.find(b => b.category === category);
  if (!bench) return null;

  if (score >= bench.p90) return 90;
  if (score >= bench.p75) return 75;
  if (score >= bench.p50) return 50;
  if (score >= bench.p25) return 25;
  return 10;
}
```

Display: next to each category score, show "top 25%" or "bottom 10%" in muted text.

Update benchmark_stats nightly with a Supabase scheduled function that recalculates percentiles from real evaluation data.

---

### Feature F: Skill Templates

Six pre-written templates, each hitting around 75/100 on evaluation.

Store as files in `src/templates/`. Each has frontmatter, instructions, examples, output spec, hard limits.

**Template selector UI:**

```jsx
const TEMPLATE_TYPES = [
  { id: "file-processing",       label: "File Processing",      desc: "Read uploaded files, extract data, output result" },
  { id: "api-integration",       label: "API Integration",      desc: "Call external service, handle auth, parse response" },
  { id: "document-generation",   label: "Document Generation",  desc: "Create PDF, DOCX, or PPTX from inputs" },
  { id: "data-analysis",         label: "Data Analysis",        desc: "Take CSV or spreadsheet, return insights" },
  { id: "code-generation",       label: "Code Generation",      desc: "Write code to spec, handle edge cases" },
  { id: "search-retrieval",      label: "Search & Retrieval",   desc: "Find information, return structured results" },
];
```

Clicking a template loads it into the editor. User fills in the specifics. Then evaluates.

---

## 16. Phase 12: Wave 3 Features

### Feature G: Public Registry

Route: `/registry`

Filter bar: skill type, minimum score (default 80), sort by (score, downloads, date).

Each card shows: title, skill type tag, score, author (first name only), download count.

Click to view full skill file. "Copy" button. "Fork" button (opens in editor with `forked_from` set).

Registry publishes only from the result view: "Publish to Registry" button, only active when score >= 80. Asks for title and type. Creates registry entry.

---

### Feature H: Certification Badge

From result view, click "Enable Badge". This sets `badge_enabled = true` on the evaluation record.

Shows embed code:

```
[![SkillLint Score](https://skilllint.dev/api/badge/[id])](https://skilllint.dev/r/[id])
```

Badge SVG updates if evaluation is re-run (links to the latest evaluation for that skill slug).

---

### Feature I: Failure Mode Simulator

10 adversarial test cases, run in parallel via Promise.all against `/api/simulate`.

```javascript
const ADVERSARIAL_CASES = [
  { id: "empty",        label: "Empty input",           message: "(no content provided)" },
  { id: "wrong_type",   label: "Wrong file type",       message: "Here's my .xlsx file" },
  { id: "malformed",    label: "Malformed content",     message: "�▒▓ broken file ▓▒�" },
  { id: "huge",         label: "Oversized input",       message: "Here's a 500-page document..." },
  { id: "ambiguous",    label: "Ambiguous request",     message: "Can you handle this for me?" },
  { id: "off_topic",    label: "Off-topic request",     message: "Write me a poem about the ocean" },
  { id: "partial",      label: "Partial input",         message: "Here's the first half of the file, get st" },
  { id: "no_context",   label: "Missing context",       message: "Process the thing we discussed" },
  { id: "multi_intent", label: "Multiple intents",      message: "Read this file AND also generate a report AND send it" },
  { id: "edge_format",  label: "Unexpected format",     message: "Here is my file in Base64: SGVsbG8gV29ybGQ=" },
];
```

Run all 10. Show results in a grid: green tick, red cross, or yellow question mark per case. Expand each to see what Claude actually did.

---

## 17. System Prompt (Complete)

This lives in `src/constants/prompts.js` and is imported by Edge Functions.

```javascript
export const SYSTEM_PROMPT = `You are SkillLint — a brutally honest evaluator of Claude skill files (.md files that instruct Claude how to perform specific tasks).

Evaluate across 10 categories with 80 heuristics. Be direct. Do not inflate scores. A mediocre skill file should score 40-55. A good one 65-80. Exceptional ones 85+.

SCORING SCALE:
- 85-100: Exceptional. Production-ready. Almost nothing to fix.
- 65-84: Good. Minor issues. Usable but improvable.
- 45-64: Needs work. Real problems that will cause unpredictable behavior.
- 25-44: Failing. Major gaps. Will cause consistent failures.
- 0-24: Critical. Start over.

For EACH category return:
- score: integer 0-100
- summary: one brutal sentence, no hedging, no softening
- issues: array of strings, each a specific problem with enough detail to act on
- fixes: array of strings, parallel to issues, each a concrete rewrite or action

Also return at the top level:
- overall_score: weighted integer per weights below
- overall_verdict: one sentence, honest, specific
- top_priority_fix: single most impactful change, name the specific section or line to change
- rewritten_trigger: if trigger/description field is weak, return a complete rewrite. If strong, return null.
- token_estimate: integer, rough estimate of tokens consumed when this file loads into context
- file_stats: object with lines (int), words (int), has_examples (bool), has_negative_triggers (bool), has_output_spec (bool)

CATEGORY WEIGHTS:
- discoverability: 15%
- instruction_quality: 18%
- scope_boundaries: 12%
- structural_integrity: 7%
- token_economics: 10%
- consistency_conflicts: 10%
- robustness: 10%
- examples_evidence: 7%
- maintainability: 3%
- security: 8%

HEURISTICS PER CATEGORY:

DISCOVERABILITY (15%):
1. Trigger Precision — specific enough to load correctly, not so broad it fires everywhere
2. Trigger Vocabulary Coverage — covers how users actually phrase requests, not just one phrasing
3. Negative Trigger Clarity — explicitly says when NOT to load
4. Trigger/Content Alignment — description matches what the skill actually does
5. Competing Skill Confusion — would this trigger at same time as another common skill
6. Keyword Redundancy — repeating same concept without adding coverage

INSTRUCTION QUALITY (20%):
7. Instruction Clarity — no ambiguous verbs like "handle", "manage", "process" without definition
8. Sequencing Logic — steps are in the right order, later steps don't assume earlier ones haven't happened
9. Conditional Coverage — if/when/else logic present for branching scenarios
10. Imperative Voice Consistency — instructions written as commands, not suggestions
11. Implicit Assumption Detection — instructions assume Claude knows something it may not
12. Instruction Atomicity — each instruction does one thing, not three bundled together
13. Action Specificity — "save the file" vs "save to /mnt/user-data/outputs/ as [filename].[ext]"
14. Tool Citation Accuracy — tools mentioned by correct name, not generic description
15. Priority Ordering — when multiple instructions could apply, which wins, is that stated

SCOPE & BOUNDARIES (12%):
16. Single Responsibility — one skill, one job
17. Scope Creep Detection — handles things outside stated purpose mid-file
18. Input Type Specification — what inputs it accepts, what it rejects
19. Output Contract — exact output format, type, location, naming convention
20. Graceful Degradation — what happens when input is wrong, missing, or malformed
21. Failure Mode Documentation — tells Claude what to say when it can't complete
22. Hard Limits Stated — what this skill explicitly will not do

STRUCTURAL INTEGRITY (8%):
23. Markdown Validity — proper syntax, no broken formatting
24. Heading Consistency — logical hierarchy, no random heading levels
25. List Formatting — consistent bullet style throughout
26. Code Block Closure — all opened ``` blocks properly closed
27. Table Structure — column counts consistent, headers present
28. Nesting Depth — lists beyond 3 levels deep are unreliable
29. Section Completeness — no headings with empty bodies
30. Logical Flow — reading top to bottom makes sense, no jumps

TOKEN ECONOMICS (10%):
31. File Size Absolute — raw token count
32. Instruction Density — useful signal per line
33. Redundancy Detection — same instruction stated multiple times
34. Preamble Bloat — lines before first actual instruction
35. Over-explanation — explaining why instead of what
36. Example Ratio — examples should illustrate, not dominate
37. Filler Language — "please", "make sure to", "it is important that"
38. Passive Voice in Instructions — "should be saved" instead of "save"

CONSISTENCY & CONFLICTS (10%):
39. Direct Contradiction Detection — two instructions that produce opposite behavior
40. Tonal Inconsistency — formal in one section, casual in another without reason
41. Terminology Consistency — same concept called different names in different sections
42. Format Inconsistency — output format described differently in examples vs spec
43. Version Drift — signs file was edited multiple times without reconciliation

ROBUSTNESS (10%):
44. Edge Case Coverage — non-happy-path scenarios addressed
45. Input Variance Handling — different file types, sizes, encodings
46. Dependency Fragility — hardcoded paths, version-specific tool names
47. Environment Assumptions — assumes tools are available without checking
48. Partial Execution Handling — what if Claude gets halfway and something fails
49. Idempotency — running the skill twice, does it break something
50. Concurrency Awareness — if relevant, handles multiple simultaneous inputs

EXAMPLES & EVIDENCE (8%):
51. Example Presence — at least one input/output example exists
52. Example Representativeness — covers real use, not just trivial case
53. Example Accuracy — example output matches what instructions would actually produce
54. Negative Examples — shows what bad input looks like and expected behavior
55. Edge Case Examples — at least one non-obvious scenario shown

MAINTAINABILITY (3%):
56. Purpose Statement Clarity — first 3 lines tell you exactly what this skill does
57. Author Intent Legibility — new person can understand design decisions
58. Change Surface Area — how many places need updating if one thing changes
59. Versioning Signals — any indication of when this was last updated
60. Dependency Documentation — external dependencies listed upfront

SECURITY (8%):
61. Destructive Action Gates — delete/overwrite/drop/truncate/wipe operations require explicit user confirmation before execution; no silent destructive actions
62. Credential & Secret Hygiene — passwords, tokens, API keys, private keys never echoed, logged, or output as plain text; masking or omission instructions present when credentials are handled
63. Prompt Injection Resistance — skill that reads external content (files, web pages, user input) treats that content as literal data, not as instructions that override skill behavior
64. Least Privilege Enforcement — accesses only specific, named resources rather than broad directory trees or all-files patterns; no wildcard access
65. Irreversibility Documentation — permanent, unrecoverable actions (send email, post to service, delete record) labeled irreversible and require confirmation before execution
66. Safe Error State — when operations fail mid-execution, skill specifies how to restore the system to a safe consistent state; no silent partial-completion of destructive sequences
67. Injection Surface Hardening — inputs that flow into shell commands, SQL queries, or code execution paths are explicitly validated, escaped, or sandboxed before use
68. Audit Trail for High-Impact Operations — destructive, financial, or external communication operations report exactly what was executed so the user can verify
69. No Overpermission Language — absent of "do anything the user asks", "bypass checks if needed", "ignore validation", "access all files"; scope is explicitly bounded
70. Data Minimization — PII, credentials, internal paths, and confidential content not propagated beyond what the task requires; no unnecessary collection or retention

ADDITIONAL HEURISTICS (factored into relevant categories):
71. Platform Specificity — written for correct runtime (claude.ai vs API vs Claude Code)
72. Tool Availability Assumptions — assumes bash or specific MCPs without stating it
73. User Context Sensitivity — aware of what user may or may not know
74. Conversation State Awareness — knows where in a conversation it might be loaded
75. Multi-turn Awareness — handles being called once vs multiple times in session
76. Best Practice Alignment — matches patterns from high-performing skill files
77. Anti-pattern Detection — common failure patterns present
78. Complexity vs Value Ratio — doing something that actually needed a skill file
79. Reusability Score — broadly applicable vs hyper-specific
80. Composability — works alongside other skills without conflict

Respond ONLY with valid JSON. No markdown. No preamble. No explanation after the JSON.

{
  "overall_score": 58,
  "overall_verdict": "Trigger is a single vague sentence that will misfire constantly and instructions assume context Claude won't have.",
  "top_priority_fix": "The description field on line 2 needs a complete rewrite — add 3 specific trigger phrases and 2 explicit exclusions.",
  "rewritten_trigger": "Use this skill whenever the user wants to create, read, or manipulate Word documents (.docx files). Triggers include: any mention of 'Word doc', '.docx', requests for formatted documents with headings or tables of contents. Do NOT use for PDFs, spreadsheets, or Google Docs.",
  "token_estimate": 340,
  "file_stats": {
    "lines": 42,
    "words": 380,
    "has_examples": false,
    "has_negative_triggers": false,
    "has_output_spec": true
  },
  "categories": {
    "discoverability": {
      "score": 45,
      "summary": "Single vague sentence will misfire on any document-related request.",
      "issues": [
        "No negative trigger examples — will compete with pdf, pdf-reading, and xlsx skills",
        "Trigger vocabulary only covers one phrasing of the task"
      ],
      "fixes": [
        "Add explicit exclusions: 'Do NOT use for PDFs, spreadsheets, Google Docs, or general coding tasks unrelated to document generation'",
        "Add 3 more trigger phrases: 'Word document', '.docx file', 'formatted report', 'document with table of contents'"
      ]
    },
    "instruction_quality": { "score": 62, "summary": "...", "issues": [], "fixes": [] },
    "scope_boundaries": { "score": 55, "summary": "...", "issues": [], "fixes": [] },
    "structural_integrity": { "score": 78, "summary": "...", "issues": [], "fixes": [] },
    "token_economics": { "score": 70, "summary": "...", "issues": [], "fixes": [] },
    "consistency_conflicts": { "score": 80, "summary": "...", "issues": [], "fixes": [] },
    "robustness": { "score": 40, "summary": "...", "issues": [], "fixes": [] },
    "examples_evidence": { "score": 20, "summary": "...", "issues": [], "fixes": [] },
    "maintainability": { "score": 65, "summary": "...", "issues": [], "fixes": [] },
    "security": { "score": 85, "summary": "...", "issues": [], "fixes": [] }
  }
}`;
```

---

## 18. Heuristics Reference

See system prompt above for full 80-heuristic list with descriptions. Quick reference:

| # | Category | Weight | Heuristics |
|---|---|---|---|
| 1 | Discoverability | 15% | 1-6 |
| 2 | Instruction Quality | 18% | 7-15 |
| 3 | Scope & Boundaries | 12% | 16-22 |
| 4 | Structural Integrity | 7% | 23-30 |
| 5 | Token Economics | 10% | 31-38 |
| 6 | Consistency & Conflicts | 10% | 39-43 |
| 7 | Robustness | 10% | 44-50 |
| 8 | Examples & Evidence | 7% | 51-55 |
| 9 | Maintainability | 3% | 56-60 |
| 10 | Security | 8% | 61-70 |
| + | Cross-category | — | 71-80 |

---

## 19. Design System

Apply consistently across every new component and view.

```css
/* Background layers */
--bg:        #080808   /* page background */
--surface:   #0a0a0a   /* cards, inputs */
--surface-2: #0d0d0d   /* raised elements */

/* Borders */
--border:    #111      /* primary borders */
--border-2:  #1a1a1a   /* secondary borders */

/* Text — nothing readable below #555 on #080808 */
--text-1:    #efefef   /* headlines */
--text-2:    #d0d0d0   /* primary body */
--text-3:    #aaa      /* secondary body */
--text-4:    #888      /* metadata, summaries */
--text-5:    #666      /* labels, small text */
--text-6:    #555      /* decorative, minimum readable */

/* Semantic colors */
--green:     #4ade80
--amber:     #fbbf24
--orange:    #fb923c
--red:       #f87171

/* Score colors (apply to all score-bearing UI) */
score >= 80  → #4ade80
score >= 60  → #fbbf24
score >= 40  → #fb923c
score <  40  → #f87171

/* Typography */
--font-sans: 'DM Sans', sans-serif       /* body, descriptions, content */
--font-mono: 'JetBrains Mono', monospace /* labels, scores, code, metadata, filenames */

/* Spacing */
--page-pad:  48px     /* horizontal padding on all views */
--max-w-result: 760px
--max-w-upload: 640px

/* Component rules */
- Nav height: 56px, sticky top, 1px border-bottom
- All buttons: JetBrains Mono, uppercase, letter-spacing 0.08em+
- Primary button: #e8e8e8 bg, #080808 text, hover → #fff
- Secondary button: transparent bg, 1px solid #161616, color #666
- Input focus: border → #1e1e1e (slight lift, no glow)
- Card: background #0a0a0a, border 1px solid #141414, border-radius 6px
- Accent border: 3px solid [semantic color] on left edge
```

---

## 20. File Structure

```
skilllint/
├── api/
│   ├── _rateLimit.js              # Rate limiting helper
│   ├── evaluate.js                # Main evaluation proxy
│   ├── simulate.js                # Live simulation
│   ├── generate.js                # NL to skill generator
│   └── badge/
│       └── [id].js                # SVG badge endpoint
│
├── src/
│   ├── main.jsx                   # Clerk provider, React root
│   ├── App.jsx                    # App shell, view routing
│   │
│   ├── constants/
│   │   └── prompts.js             # System prompts (single source of truth)
│   │
│   ├── lib/
│   │   ├── staticAnalysis.js      # Client-side heuristics (no API needed)
│   │   ├── keyManager.js          # localStorage key management
│   │   ├── supabase.js            # Supabase client
│   │   ├── history.js             # Save/load evaluation history
│   │   ├── benchmark.js           # Percentile calculations
│   │   └── errors.js              # Error message mapping
│   │
│   ├── components/
│   │   ├── ScoreArc.jsx           # SVG score ring
│   │   ├── CategoryRow.jsx        # Expandable category with issues/fixes
│   │   ├── KeyInput.jsx           # API key input/display
│   │   ├── DiffView.jsx           # Side-by-side diff
│   │   ├── ScoreSparkline.jsx     # Version score trend line
│   │   ├── SimulationPanel.jsx    # Live simulation UI
│   │   └── TemplateSelector.jsx   # Skill template picker
│   │
│   ├── views/
│   │   ├── LandingView.jsx        # Signed-out marketing page
│   │   ├── UploadView.jsx         # File upload + static results
│   │   ├── LoadingView.jsx        # Animated loading screen
│   │   ├── ResultView.jsx         # Full evaluation results
│   │   ├── HistoryView.jsx        # Past evaluations + versions
│   │   ├── TeamView.jsx           # Org skill library
│   │   ├── RegistryView.jsx       # Public skill registry
│   │   └── GenerateView.jsx       # NL to skill generator
│   │
│   ├── templates/
│   │   ├── file-processing.md
│   │   ├── api-integration.md
│   │   ├── document-generation.md
│   │   ├── data-analysis.md
│   │   ├── code-generation.md
│   │   └── search-retrieval.md
│   │
│   └── index.css                  # Global resets, font imports
│
├── public/
│   └── favicon.svg                # SL monogram
│
├── .env.local                     # Local env vars (never commit)
├── .gitignore
├── vercel.json                    # Vercel config + CORS headers
├── package.json
└── vite.config.js
```

---

## 21. Environment Variables

### Local (`.env.local`)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Vercel dashboard only (never in code or `.env`)

| Variable | Used in | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Not used — BYOK model | N/A — users bring their own |
| `CLERK_SECRET_KEY` | Edge Functions | Verify Clerk JWTs server-side |
| `SUPABASE_URL` | Edge Functions | Badge endpoint server-side reads |
| `SUPABASE_SERVICE_KEY` | Edge Functions | Bypass RLS for badge reads |

Note: Because we use BYOK, `ANTHROPIC_API_KEY` is never needed on our server. The user's key is passed as `X-Api-Key` header per request and forwarded directly.

### Vercel (all environments)

| Variable | Source |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `VITE_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
| `SUPABASE_URL` | Same as VITE_SUPABASE_URL |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Settings → API → service_role |

---

## 22. Build Order

Do these in sequence. Do not skip ahead.

```
[ ] 1.  npm create vite, copy App.jsx, npm install, confirm it boots
[ ] 2.  Create src/constants/prompts.js — extract system prompt from App.jsx
[ ] 3.  Create api/evaluate.js — proxy with BYOK header forwarding
[ ] 4.  Update App.jsx fetch to call /api/evaluate with X-Api-Key header
[ ] 5.  Create src/lib/keyManager.js
[ ] 6.  Create src/components/KeyInput.jsx
[ ] 7.  Add KeyInput to UploadView, wire to evaluate call
[ ] 8.  Test: full evaluation works locally via Edge Function
[ ] 9.  Create src/lib/staticAnalysis.js
[ ] 10. Wire static analysis: runs immediately on file load, shows partial score
[ ] 11. Update UploadView: show static score + "Add key for full evaluation" CTA
[ ] 12. Deploy to Vercel, set env vars, confirm production works
[ ] 13. Add Clerk: main.jsx provider, LandingView for signed-out users
[ ] 14. Add Clerk auth to Edge Functions (verify JWT from Authorization header)
[ ] 15. Create Supabase project, run full schema SQL
[ ] 16. Configure Clerk JWT template for Supabase
[ ] 17. Create src/lib/supabase.js and src/lib/history.js
[ ] 18. Replace localStorage history with Supabase
[ ] 19. Test: history saves and loads for authenticated users
[ ] 20. Build LandingView
[ ] 21. Create src/lib/errors.js, add error handling to all API calls
[ ] 22. Add rate limiting to api/evaluate.js
[ ] 23. Add retry logic to evaluate flow
[ ] 24. Install diff library, build DiffView component
[ ] 25. Wire DiffView to rewritten trigger section
[ ] 26. Add skill_slug and version to evaluation save flow
[ ] 27. Update HistoryView: group by skill_slug, show sparklines
[ ] 28. Build ScoreSparkline component
[ ] 29. Create api/simulate.js
[ ] 30. Build SimulationPanel component, add to ResultView
[ ] 31. Fetch benchmark stats from Supabase, show percentiles
[ ] 32. Build TemplateSelector, write 6 template files
[ ] 33. Build TeamView: org creation, invite link, shared skill list
[ ] 34. Build RegistryView: filter, search, skill cards
[ ] 35. Create api/generate.js
[ ] 36. Build GenerateView
[ ] 37. Create api/badge/[id].js
[ ] 38. Add "Enable Badge" to ResultView, show embed code
[ ] 39. Build failure mode simulator (10 adversarial cases)
[ ] 40. Final QA, mobile check, contrast check
```

---

## 23. SQL Reference

Queries you will use repeatedly.

```sql
-- Save evaluation
insert into evaluations (user_id, filename, skill_slug, version, score, static_score, result, static_result)
values ($1, $2, $3, $4, $5, $6, $7, $8)
returning id;

-- Load user history
select id, filename, skill_slug, version, score, static_score, created_at
from evaluations
where user_id = $1
order by created_at desc
limit 50;

-- Load versions of a skill
select * from evaluations
where user_id = $1 and skill_slug = $2
order by version asc;

-- Next version number for a skill
select coalesce(max(version), 0) + 1 as next_version
from evaluations
where user_id = $1 and skill_slug = $2;

-- Registry search
select id, title, skill_type, score, downloads, published_at,
       left(content, 200) as preview
from registry
where ($1::text is null or skill_type = $1)
  and score >= coalesce($2, 80)
order by score desc, downloads desc
limit 20 offset $3;

-- Increment download count
update registry set downloads = downloads + 1 where id = $1;

-- Benchmark percentiles (recalculate nightly)
select
  category,
  percentile_cont(0.10) within group (order by score) as p10,
  percentile_cont(0.25) within group (order by score) as p25,
  percentile_cont(0.50) within group (order by score) as p50,
  percentile_cont(0.75) within group (order by score) as p75,
  percentile_cont(0.90) within group (order by score) as p90,
  count(*) as sample_size
from (
  select category_key as category,
         (result -> 'categories' -> category_key ->> 'score')::int as score
  from evaluations,
       jsonb_object_keys(result -> 'categories') as category_key
  where result is not null
) sub
group by category;
```

---

*This is the complete plan. Everything needed to build skilllint.dev from the existing App.jsx to a fully deployed, production-grade product.*
