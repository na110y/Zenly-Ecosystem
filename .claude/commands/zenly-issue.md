# /zenly-issue — Work on a specific Phase 1 issue

**Usage:** `/zenly-issue <id>` (e.g. `007`, `P1-I007`)

## Steps

1. Run: `python3 .claude/scripts/issue_context.py $ARGUMENTS`
   - If status is not TODO or IN_PROGRESS → report status and stop.
   - If any dependency is not DONE → report `BLOCKED: P1-I<id> depends on P1-I<dep> which is <status>` and stop.

2. Run: `python3 .claude/scripts/validate_phase_docs.py`
   - If errors → report all and stop.

3. Read these files in full (do not skim):
   - `plan/Zenly_Ecosystem_Phase_1_Plan.md`
   - The issue file
   - Every canonical module listed by the issue

4. Before writing any code, print:
   ```
   Issue:             P1-I<id> — <title>
   Dependencies:      <list, each DONE>
   Canonical sources: <module ID: file path>
   Requirement IDs:   <from canonical modules>
   Files to change:   <exact paths>
   Schema impact:     <describe or "none">
   API impact:        <describe or "none">
   UI impact:         <describe or "none">
   Security impact:   <describe or "none">
   ```

5. Inspect the repo. Preserve all unrelated user changes.

6. Edit only within the issue's allowed change surface. If a prerequisite is missing → `BLOCKED`.

7. Write tests in the same change as production code.

8. Run narrowest relevant checks first, then full affected quality gate.

9. If issue ↔ canonical module ↔ code disagree → `SPEC_CONFLICT` with exact evidence. Never resolve silently.
