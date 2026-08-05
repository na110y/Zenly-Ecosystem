# /zenly-review — Independent review pass before closing an issue

**Usage:** `/zenly-review <id>`

## Steps

1. Run: `python3 .claude/scripts/issue_context.py $ARGUMENTS`

2. Read in full:
   - The issue file
   - Every canonical module listed
   - Every file in the allowed change surface

3. Review each dimension:

### Correctness
- Does implementation satisfy every acceptance criterion?
- Does it match canonical module specs exactly (not approximately)?
- Are all state transitions enforced?

### Security
- Auth before authz?
- Authz enforced server-side (not just hidden in UI)?
- Admin/public session namespaces isolated?
- CSRF, rate-limit, CAPTCHA, audit controls where specified?
- No secrets/contact values/visitor hashes/stack traces/raw provider responses in APIs or logs?

### Database
- All required constraints (FK, unique, check, index) in the migration?
- Transactions used where specified?
- Idempotency keys enforced?
- Migration forward-safe, deterministic, non-destructive?

### Architecture
- Domain logic outside Vue components and route handlers?
- Route handlers: validate → authorize → use case → map response?
- Provider calls behind adapters?
- No new runtime dependencies that bust the 2 GB VPS budget?

### Tests
- Each test derives from acceptance criteria, not implementation lines?
- Can each test actually fail when behavior is broken?
- Integration tests use real PostgreSQL (not SQLite or broad mocks)?
- Concurrency tests use overlapping operations (not sequential calls)?

4. Report findings:
   ```
   REVIEW_FINDING [BLOCKER | MAJOR | MINOR]
   File: <path:line>
   Issue: <description>
   Required change: <what must be fixed>
   ```

5. Summary:
   - No blockers/majors → `REVIEW_PASS: P1-I<id>`
   - Blockers/majors found → `REVIEW_FAIL: P1-I<id> — <N> blocker(s). Do not mark DONE.`
