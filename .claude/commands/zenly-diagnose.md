# /zenly-diagnose — Diagnose a problem with evidence-first methodology

**Usage:** `/zenly-diagnose <problem description>`

## Steps

1. Problem: `$ARGUMENTS`

2. Do NOT propose or apply any fix before completing diagnosis.

3. Read the actual implementation files. Trace the complete call path:
   - Route handler → use case → repository → database
   - Identify every caller/consumer of the broken code

4. Collect evidence from at least two sources:
   - Source code (read files, not filenames)
   - Failing tests or test output
   - Logs or error messages
   - Database schema/state
   - Request/response behavior

5. If evidence is insufficient → stop with:
   ```
   INSUFFICIENT_EVIDENCE
   Problem: <description>
   Evidence collected: <list>
   Next inspection needed: <exact files/queries to check>
   ```

6. When root cause is confirmed, report:
   ```
   ROOT CAUSE
   File:      <path:line>
   Mechanism: <exactly what goes wrong>

   AFFECTED CALLERS
   <list of files/functions that depend on the broken code>

   INVARIANTS THAT MUST STAY TRUE
   <what must not break after the fix>

   REGRESSION TEST
   <test that will FAIL before fix, PASS after fix>

   PROPOSED FIX
   <minimal change — allowed change surface only>
   ```

7. Do not rewrite broadly, upgrade dependencies, or apply speculative patches.
