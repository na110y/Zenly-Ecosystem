# /zenly-close — Mark a Phase 1 issue as DONE

**Usage:** `/zenly-close <id>`

## Steps

1. Run: `python3 .claude/scripts/issue_context.py $ARGUMENTS`
   - Confirm status is IN_PROGRESS.

2. All must be true — if any is false, stop and state what is missing:
   - [ ] Quality gate PASSED
   - [ ] Review PASSED
   - [ ] All acceptance criteria met
   - [ ] No open SPEC_CONFLICT
   - [ ] No open REVIEW_FINDING BLOCKER or MAJOR
   - [ ] Tests committed with production code

3. Update the issue file:
   - `**Status:** IN_PROGRESS` → `**Status:** DONE`
   - Append:
     ```markdown
     ## Completion evidence
     - Quality gate: PASS (<line>% line, <branch>% branch, <N> tests)
     - Review: PASS
     - Closed: <YYYY-MM-DD>
     ```

4. Update `plan/00_ISSUE_INDEX.md`: change status column to `DONE`.

5. Run: `python3 .claude/scripts/validate_phase_docs.py` — confirm OK.

6. Report:
   ```
   CLOSED: P1-I<id> — <title>
   Status: DONE in issue file and index.
   ```

Do not commit, push, or deploy unless the user explicitly requests it.
