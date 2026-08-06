Zenly Stories — Claude Code instructions

Source of truth

Read Zenly_Ecosystem_Phase_1_Plan.md before any Phase 1 implementation.

Implement exactly one atomic issue from Phase 1/Issues/ per change.

An issue sequences work; it does not redefine requirements. The canonical modules named by the issue own business rules.

If the issue, canonical modules, and current code disagree, stop and report SPEC_CONFLICT with exact file/section evidence. Never choose silently.

Fixed Phase 1 invariants

Architecture: one Nuxt/Nitro modular monolith, PostgreSQL/Prisma, and Caddy. Launch must fit a 2 GB VPS.

Do not add Redis, a separate queue server, microservices, marketplace, payment/VIP, mobile app, chat realtime, user media, or AI-generated content.

Guest and user may view, share, like, comment/reply, and request stories at launch. User posting/reporting are runtime flags and default to off.

SUPER_ADMIN, ADMIN, and USER are distinct. Hiding UI is never authorization; enforce access in server APIs.

Admin authentication requires password plus TOTP. Public user sessions must never authorize admin APIs.

Only SUPER_ADMIN may change System settings, community flags, infrastructure-sensitive settings, or automatic story notification settings.

Provider/moderation failures are fail-safe and must not auto-publish content.

Automatic story notifications being off must not disable account, security, or direct story-request notifications and must not release an old backlog when re-enabled.

Atomic issue protocol

Resolve the issue with python3 .claude/scripts/issue_context.py <id>.

Verify every dependency is DONE and run python3 .claude/scripts/validate_phase_docs.py.

Read the Master, the selected issue, and every canonical module listed by that issue in full.

Before editing, print: issue ID, dependencies, canonical sources read, requirement sections, exact intended files, and schema/API/UI/security impact.

Inspect the current repository and preserve unrelated user changes.

Edit only the issue's allowed change surface. A missing prerequisite means BLOCKED; do not absorb another issue.

Write tests in the same change as production code.

Run the narrowest relevant checks first, then the full affected quality gate.

Do not mark DONE without complete evidence and an independent review pass.

Engineering rules

Evidence before edits: read the actual implementation and trace the complete call path before proposing or applying a fix. Never infer code behavior from filenames, issue text, or assumptions alone.

For a bug, first reproduce it or collect concrete evidence from code, tests, logs, database state, or request/response behavior. If evidence is insufficient, stop with INSUFFICIENT_EVIDENCE and state what must be inspected next.

Before fixing existing code, identify the root cause, affected callers/consumers, invariants that must remain true, and the regression test that will fail before the fix and pass after it.

Do not perform speculative edits, broad rewrites, dependency upgrades, or “try this” patches without a verified failure mechanism.

Use TypeScript strict. Do not introduce any, unchecked casts, or disabled diagnostics to make checks pass.

Validate environment variables and every request at runtime. Reject unknown DTO fields where the contract requires it.

Keep domain logic outside Vue components and route handlers. Route handlers validate, authorize, call a use case, and map the response.

Database constraints are part of correctness. Use transactions, unique constraints, optimistic concurrency, and idempotency keys where specified.

Never expose secrets, contact values, visitor hashes, internal file paths, stack traces, or raw provider responses through APIs or logs.

No destructive migration without an explicit rollback/compensation plan and migration rehearsal.

Never change a canonical requirement merely to fit the implementation.

Quality gate

No test means not done.

Use real PostgreSQL for integration tests; do not substitute SQLite.

Cover happy path, validation, authorization, ownership, state boundaries, idempotency/retry, concurrency, provider timeout/429/5xx/malformed output, privacy, cache, and logging when applicable.

Feature flags require both UI-state tests and direct API-enforcement tests.

Minimum project thresholds: 90% line coverage, 85% branch coverage; critical specified business branches must reach 100%.

Do not hide failures with skipped/flaky tests, snapshots that approve incorrect behavior, broad mocks, or reduced thresholds.

Autonomous multi-issue loop

When the user asks to work through issues continuously (e.g. "code hết các issue", "chạy tự động"), chain the controlled workflow without stopping for per-step approval clicks: pick the next ready issue via /zenly-next, implement it, run /zenly-quality-gate, run /zenly-review, and if both pass, /zenly-close, then immediately continue to the next ready issue. Repeat without asking "continue?" between issues.

If the quality gate or review finds a failure that is a straightforward implementation defect (failing test, lint/type error, missed acceptance criterion within the current issue's allowed change surface), fix it and re-run the narrowest relevant check, then the full gate, without pausing to ask permission — this is normal iteration, not a new decision.

Stop the loop and report to the user, do not guess, when: a dependency is not DONE (BLOCKED), the issue/canonical modules/code disagree (SPEC_CONFLICT), evidence is insufficient to diagnose a failure (INSUFFICIENT_EVIDENCE), a fix would require touching a change surface outside the current issue, the same check fails after a genuine fix attempt (not a retry loop), or no issue in Phase 1/Issues/ is currently ready.

The loop never commits, pushes, or marks an issue DONE without the complete evidence and independent review pass already required above — going faster between issues does not relax that bar.

Commands and safety

Use package scripts from package.json; do not invent alternate toolchains.

Do not commit, push, deploy, alter production, rotate secrets, or run destructive database commands unless the user explicitly requests that action.

Never edit .env or print secret values. Use .env.example with placeholders when configuration changes are required.

Use /zenly-next, /zenly-diagnose <problem>, /zenly-issue <id>, /zenly-spec-check <id>, /zenly-quality-gate <id>, /zenly-review <id>, and /zenly-close <id> for the controlled workflow.