# /zenly-quality-gate — Run the full quality gate for an issue

**Usage:** `/zenly-quality-gate <id>`

## Steps

1. Run: `python3 .claude/scripts/issue_context.py $ARGUMENTS`

2. Run: `python3 .claude/scripts/validate_phase_docs.py`

3. Run narrowest checks first (using scripts from `package.json` only):
   - Type check
   - Lint
   - Unit tests for touched modules

4. Run the full affected quality gate.

5. Verify coverage thresholds:
   - Line ≥ 90%
   - Branch ≥ 85%
   - Critical business branches = 100%

6. Verify test categories are covered:
   - [ ] Happy path
   - [ ] Validation (invalid input, unknown fields, type errors)
   - [ ] Authorization (each role, cross-role, ownership bypass, disabled feature direct API call)
   - [ ] State boundaries (invalid transitions)
   - [ ] Idempotency/retry (same request twice → same durable state)
   - [ ] Concurrency (overlapping writes, optimistic lock conflicts)
   - [ ] Provider failure (timeout, 429, 5xx, malformed response, retry exhaustion, fail-safe)
   - [ ] Privacy (no secrets/stack traces/raw DB errors in responses)
   - [ ] Feature flags (UI state + direct API enforcement)

7. Report:
   ```
   QUALITY_GATE_PASS: P1-I<id>
   Coverage: <line>% line, <branch>% branch
   Tests: <N> passed, 0 skipped, 0 failed
   ```
   or
   ```
   QUALITY_GATE_FAIL: P1-I<id>
   <failure list with file:line>
   ```
   Do not mark DONE on failure.
