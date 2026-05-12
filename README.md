# SkillLint

Score your Claude skill files across 75 heuristics. Get specific rewrites for every failing dimension.

---

## What it does

Claude skill files are written everywhere with no quality bar. Bad ones silently degrade how Claude behaves — vague triggers that misfire, instructions that assume context Claude won't have, no output spec, no edge case coverage.

SkillLint runs every skill file through a structured evaluation across 10 categories: discoverability, instruction quality, scope boundaries, structural integrity, token economics, consistency, robustness, examples, maintainability, and safety. Each category returns a score, a one-sentence verdict, and parallel issue/fix pairs with enough detail to act on immediately.

Static analysis runs free, in the browser, no account needed. Full 75-heuristic LLM evaluation requires an Anthropic API key — yours, not ours.

---

## How it works

Upload or paste a `.md` skill file. Static analysis runs immediately and scores roughly 22 of the 75 heuristics client-side. If you add an Anthropic API key, the full evaluation proxies through a Vercel Edge Function that forwards your key to the Anthropic API and returns the complete scored report.

Your key stays in `localStorage` — it's sent as an `X-Api-Key` header per request and never touches our server.

---

## Running locally

```bash
npm install
npm run dev
```

For the Edge Function to work locally, install the Vercel CLI and run `vercel dev` instead of `npm run dev`. Pass a valid Anthropic API key in the `X-Api-Key` request header.

```bash
npm install -g vercel
vercel dev
```

---

## Tech stack

- Vite + React
- Vercel Edge Functions (API proxy)
- DM Sans + JetBrains Mono

Supabase (history) and Clerk (auth) are coming in later phases.

---

## Project structure

```
api/              Vercel Edge Functions
src/
  App.jsx
  constants/      System prompts — single source of truth
  lib/            Static analysis, key management, history
  components/
  views/
reviewers/        Expert reviewer personas used in development
CLAUDE.md         Ground rules for this project
SKILLLINT_PLAN.md Full implementation plan
```

---

## Development process

Every plan gets reviewed by three expert agents before implementation starts — a senior code reviewer, a SaaS architect, and a QA engineer. Every commit passes a pre-push gate before it reaches the remote. The reviewer definitions live in `reviewers/` and the ground rules are in `CLAUDE.md`.
