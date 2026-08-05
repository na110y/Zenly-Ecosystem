# /zenly-next — Pick the next ready issue and begin implementation

Picks the first dependency-ready TODO issue and begins the atomic issue protocol.

## Steps

1. Run: `python3 .claude/scripts/issue_context.py --next`
   - If no issue ready → report "No dependency-ready TODO issue found" and stop.

2. Run: `python3 .claude/scripts/validate_phase_docs.py`
   - If errors → report all and stop.

3. Read these files in full (do not skim):
   - `plan/Zenly_Ecosystem_Phase_1_Plan.md`
   - Every canonical module file listed by the issue (use the module registry paths)
   - The issue file itself

4. Before writing any code, print:
   ```
   Issue:             P1-I<id> — <title>
   Dependencies:      <list or "none" — each must be DONE>
   Canonical sources: <module ID: file path>
   Files to change:   <exact paths>
   Schema impact:     <describe or "none">
   API impact:        <describe or "none">
   UI impact:         <describe or "none">
   Security impact:   <describe or "none">
   ```

5. Implement:
   - Edit only within the issue's allowed change surface
   - Write tests in the same change as production code
   - Run narrowest checks first, then full quality gate

6. If issue ↔ canonical module ↔ code disagree → stop with:
   ```
   SPEC_CONFLICT
   File: <path>
   Issue says: <text>
   Module says: <text>
   Code says: <text>
   ```
