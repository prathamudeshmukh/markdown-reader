# JIT Catching Tests

## What & Why

JIT (Just-In-Time) Catching Tests are ephemeral, LLM-generated tests that run against code changes and are discarded after each run. Inspired by Meta's JiTTesting workflow ([arXiv 2601.22832](https://arxiv.org/abs/2601.22832), [Meta engineering blog](https://engineering.fb.com/2026/02/11/developer-tools/the-death-of-traditional-testing-agentic-development-jit-testing-revival/)).

**Problem with traditional tests in fast-moving codebases:**
- Static test suites require upfront authoring and ongoing maintenance
- Tests drift from actual intent as code evolves
- Each code change demands new tests, creating a bottleneck

**JIT approach:**
- Tests are generated on-demand by Claude (Sonnet 4.6) based on the *intent* of the change
- Tests are ephemeral — never committed, no maintenance burden
- Tests focus on *catching* regressions, not proving coverage
- Complement (not replace) the existing 140 hand-written tests

---

## How It Works

```
git diff  →  intent inference  →  mutation generation  →  test generation  →  mutation loop  →  report
```

### 6-Step Pipeline

1. **Change detection** — `git diff HEAD` (or `--cached` for staged-only) finds changed `.ts`/`.tsx` files
2. **Intent inference** — Claude reads the diff and describes what the change is *supposed to do*
3. **Mutation generation** — Claude produces 4 realistic bug mutations (subtle changes a developer might accidentally introduce)
4. **Test generation** — Claude writes Vitest + RTL catching tests targeting each mutation
5. **Signal filtering (mutation loop):**
   - Run tests against original code → must PASS (baseline check)
   - For each mutation: apply mutation, run tests, revert
   - Valid "catching" test: passes on original code AND fails on mutated code
   - Invalid (false positive): filtered out automatically
6. **Reporting** — Print summary of caught mutations

---

## Usage

```bash
# Run against all uncommitted changes
npm run jit

# Run against staged changes only (ideal for pre-commit hooks)
npm run jit:staged
```

### Optional Pre-Commit Hook

Add to `.git/hooks/pre-commit` (or configure with husky):

```sh
#!/bin/sh
npm run jit:staged
```

---

## Setup

### Prerequisites

Set `ANTHROPIC_API_KEY` in your shell or `.env.local`:

```sh
export ANTHROPIC_API_KEY=sk-ant-...
```

### Dependencies (dev only)

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Claude API client |
| `tsx` | Run TypeScript scripts directly |

---

## Architecture

```
scripts/jit/
├── index.ts            # CLI entry point — orchestrates the pipeline
├── changeDetector.ts   # git diff → { filePath, diff, originalContent }[]
├── llmClient.ts        # @anthropic-ai/sdk wrapper (claude-sonnet-4-6)
├── testGenerator.ts    # 3-prompt chain: intent → mutations → catching tests
├── testRunner.ts       # Writes temp tests, runs vitest, parses results
└── reporter.ts         # Formats results to stdout
```

Temp test files live in `src/test/jit/` (gitignored) and are deleted after each run.

---

## Constraints & Costs

- **API cost**: 3 Claude calls per changed file (intent + mutations + tests). Use `--staged` to limit scope.
- **Speed**: Vitest cold-start per mutation adds ~2-3s each. Keep changed files small.
- **False positives**: Automatically filtered by the baseline PASS check — if a generated test fails on correct code, it is discarded.
- **No persistence**: JIT tests do not live in the codebase and do not affect `npm test`.
