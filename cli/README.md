# skilllint

Lint Claude skill files from the command line, or install the `/skilllint` skill into Claude Code for in-conversation evaluation.

## Install

```
npm install -g @tiwariritesh/skilllint
```

Or use without installing:

```
npx @tiwariritesh/skilllint@latest --install-skill
```

## Usage

### Install the Claude Code skill

Adds `/skilllint` to Claude Code so you can evaluate skill files directly in any conversation:

```
skilllint --install-skill
```

Then in Claude Code:

```
/skilllint path/to/your-skill.md
```

Claude runs a full 80-heuristic evaluation and writes two files alongside your skill:

- `your-skill-analysis.md` — scored report with issues and fixes per category
- `your-skill-improved.md` — rewritten version with failing sections fixed

### Static analysis (CLI)

Run a fast static analysis against 6 categories without an LLM:

```
skilllint path/to/your-skill.md
```

For the full 80-heuristic LLM evaluation, use the Claude Code skill or visit [skilllint.dev](https://skilllint.dev).

### Options

```
--min-score <n>   Exit 1 if score is below n. Default: 50. Range: 0–100.
--json            Emit raw JSON. Exit codes still apply.
--no-color        Suppress ANSI color output. Also respects NO_COLOR env var.
--version         Print version.
--help            Print usage.
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Score at or above threshold |
| 1 | Score below threshold |
| 2 | Not a valid skill file |
| 3 | File not found, bad flag, or tool error |

## What is a Claude skill file?

A skill file (`.md`) tells Claude how to perform a specific task when a user types a slash command like `/commit` or `/review-pr`. Skill files live in `~/.claude/skills/<skill-name>/SKILL.md`.

skilllint checks them for discoverability, instruction quality, scope, token efficiency, security posture, and more.

## Keep the skill up to date

The `/skilllint` Claude Code skill is bundled in this package. When you update the package, reinstall the skill:

```
npx @tiwariritesh/skilllint@latest --install-skill
```

## License

MIT
