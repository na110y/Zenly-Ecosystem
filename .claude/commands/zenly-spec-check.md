# /zenly-spec-check — Check spec compliance for an issue

**Usage:** `/zenly-spec-check <id>`

## Steps

1. Run: `python3 .claude/scripts/issue_context.py $ARGUMENTS`

2. Read in full:
   - The issue file
   - Every canonical module listed by the issue
   - Every file in the allowed change surface

3. For each requirement in scope, verify:
   - **API:** request validation, response shape, error codes, auth/authz, feature flags
   - **Database:** constraints, indexes, transactions, idempotency keys
   - **Business logic:** use cases enforce rules exactly as stated
   - **Security:** CSRF, rate limits, CAPTCHA, audit, privacy controls
   - **Frontend:** loading / empty / error / forbidden / success states

4. Report each discrepancy:
   ```
   SPEC_CONFLICT
   File: <path:line>
   Requirement (module ID, section): <exact requirement text>
   Implementation: <what the code actually does>
   ```

5. Report each missing implementation:
   ```
   SPEC_GAP
   Missing: <requirement text>
   Expected file: <path>
   ```

6. If nothing found:
   ```
   SPEC_OK: P1-I<id> — all sampled requirements verified.
   ```

Do not fix anything during spec-check. Only report.
