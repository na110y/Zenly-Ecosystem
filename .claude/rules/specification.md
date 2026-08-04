paths:

"Zenly_Ecosystem_Phase_1_Plan.md"

"Phase 1/**/*.md"

"docs/**/*.md"

Specification maintenance rules

A requirement has one canonical owner. Other documents may reference its ID but must not copy and redefine it.

Change the canonical module first, then update traceability, affected issue acceptance, tests, and the Master only if a global invariant/version/dependency changed.

Never create files named final, copy, (2), or parallel replacement specifications.

Issue files may change status and completion evidence without changing requirement meaning.

Run python3 .claude/scripts/validate_phase_docs.py after editing Phase 1 Markdown.

If a requested change crosses Phase 1 exclusions, stop and report scope impact before editing.