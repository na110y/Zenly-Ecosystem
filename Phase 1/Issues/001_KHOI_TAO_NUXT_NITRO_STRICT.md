# P1-I001 — Khởi tạo Nuxt Nitro strict

**Stage:** foundation  
**Status:** DONE  
**Depends on:** —  
**Canonical modules — read fully:** P1-SCOPE, P1-ARCH, P1-QA  
**Previous:** — · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I002](./002_KIEM_TRA_CAU_HINH_MOI_TRUONG.md)

## Objective

Tạo project Nuxt/Nitro một repository, TypeScript strict, scripts dev/build/test/lint và cấu trúc app/server/prisma/storage/docs đúng P1-ARCH.

## Allowed change surface

package.json; nuxt.config.ts; tsconfig; app/; server/; prisma/; storage/; docs/. AI must inspect the actual repository first and list exact files before editing. Do not modify unrelated modules or silently expand Phase 1.

## Required implementation

- Implement only the objective above according to the named canonical modules; reuse existing boundaries and contracts.
- Add or update schema/API/UI only when the canonical requirement for this issue requires it.
- Preserve idempotency, authorization, audit, privacy, cache invalidation and failure behavior applicable to this logic.
- If a missing prerequisite is discovered, mark BLOCKED and name the dependency; do not implement it inside this issue.

## Tests required in the same change

Build production, typecheck và smoke test server khởi động thành công; không thêm monorepo/microservice/Redis.

Also cover applicable invalid input, role/ownership, boundary state, retry/idempotency, concurrency and regression paths from P1-QA. Provider logic must include timeout, 429, 5xx and malformed response where applicable.

## Acceptance gate

- All dependencies verified DONE; canonical modules read completely.
- Target behavior works through the real service/repository/API/UI path, not only mocks.
- Typecheck, lint, affected unit/integration/contract/E2E tests pass on PostgreSQL.
- Coverage does not fall below P1-QA thresholds; no new P0/P1/security/privacy issue.
- Rollback/compensation behavior is documented for migrations, files, external providers or destructive state changes.

## Completion evidence

```text
Issue: P1-I001
Canonical requirement sections: P1-SCOPE §3.1 (architecture invariant), P1-ARCH §1-4 (modular monolith, stack, directory structure, module boundary), P1-QA §1-2 (coverage thresholds, test types)
Dependencies verified: none (foundation issue)
Exact files changed: .prettierignore (exclude Phase 1/*.md canonical spec from formatting), vitest.config.ts (exclude e2e/** from vitest discovery so Playwright specs don't collide), e2e/smoke.spec.ts (new), docs/.gitkeep (new; storage/.gitkeep created locally but storage/ is gitignored by design per P1-ARCH §3 private storage)
Migration/schema result: none — schema.prisma retains generator/datasource only, no business tables (correct for this issue; business schema is P1-I004/P1-I010/P1-I030 etc.)
API/UI result: none — default Nuxt welcome page retained; no business route added
Unit/component tests: tests/setup/smoke.test.ts (pre-existing) — vitest runner + Vue import proof, 2 passed
Integration/contract tests: not applicable — no repository/provider code exists yet in this issue
E2E/security/performance tests: e2e/smoke.spec.ts — asserts built Nitro server returns HTTP 200 and correct title on desktop + mobile Playwright projects, 2 passed
Coverage delta: 100% (0/0) — no business statements/branches exist yet; P1-QA §1 thresholds vacuously satisfied, will apply once business code lands
Acceptance items satisfied: (1) dependencies n/a-none, canonical modules read in full; (2) real build+server path exercised (production build → node .output/server/index.mjs → HTTP 200), not mocked; (3) format:check, lint, typecheck, test:coverage, build, check:cycles, check:deps, test:e2e all pass; (4) coverage at threshold (no regression possible, 0 baseline); (5) rollback n/a — no migration/destructive change, plain scaffolding
Rollback/compensation: none required — no schema migration, no destructive change; revert is a plain git revert of the listed files
Known limitations (no P0/P1): pre-existing repo debt noted and left out-of-scope — .nuxt/ and .output/ build artifacts are tracked in git despite .gitignore excluding them (predates this issue); flagged for a separate follow-up (git rm --cached), not fixed here since it is outside issue 001's allowed change surface and requires explicit user confirmation before altering tracked history
```

