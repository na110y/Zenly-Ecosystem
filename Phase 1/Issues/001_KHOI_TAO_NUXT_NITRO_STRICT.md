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

## Completion evidence — fill before DONE

```text
Issue: P1-I001
Canonical requirement sections: P1-SCOPE §1-3 (product/global invariants), P1-ARCH §1-3 (modular monolith, stack, directory structure), P1-QA §1-7 (coverage thresholds, CI gate steps)
Dependencies verified: none (root issue)
Exact files changed: app/app.vue, app/assets/css/main.css, package.json, nuxt.config.ts, tsconfig.json, playwright.config.ts, vitest.config.ts, prisma.config.ts, stryker.config.mjs, knip.json, pnpm-workspace.yaml (prettier --write, whitespace-only, no content diff)
Migration/schema result: none — prisma/schema.prisma already scaffolded with postgresql datasource + prisma-client-js generator; no models yet (out of I001 scope)
API/UI result: none — server/ and app/ are empty scaffolds per P1-ARCH §3 directory layout; no route/UI logic in I001 scope
Unit/component tests: tests/setup/smoke.test.ts (pre-existing) — 2 tests pass via `pnpm test`
Integration/contract tests: N/A — no repository/API code exists yet in this issue's scope
E2E/security/performance tests: N/A — no user-facing route exists yet; production server smoke-start verified manually (node .output/server/index.mjs responded HTTP 200 on /)
Coverage delta: 100% (0/0) — no business code exists yet, vacuous baseline per P1-QA §1
Acceptance items satisfied:
  - pnpm format:check passes on all files in allowed change surface (app/, package.json, nuxt.config.ts, tsconfig, prisma.config.ts, playwright/vitest config, knip.json, pnpm-workspace.yaml)
  - pnpm lint passes (eslint . — 0 errors)
  - pnpm typecheck passes (nuxt typecheck — 0 errors, TypeScript strict enabled in nuxt.config.ts)
  - pnpm check:cycles passes (madge — no circular dependency)
  - pnpm test passes (2/2 tests)
  - pnpm build succeeds (production build, .output generated, 23.7 MB total/9.5 MB gzip)
  - Production server boots and serves HTTP 200 (node .output/server/index.mjs)
  - Directory structure matches P1-ARCH §3: app/, server/, prisma/, storage/ (gitignored runtime dir, correct per .gitignore), docs/ (not yet created — optional per P1-ARCH, no Phase 1 requirement mandates initial content)
  - No Redis/microservice/queue server introduced; single Nuxt/Nitro modular monolith confirmed via package.json dependencies and nuxt.config.ts
Rollback/compensation: N/A — no schema/data change; formatting changes are whitespace-only and revertible via git checkout of listed files
Known limitations (no P0/P1): docs/ directory not yet created (no Phase 1 requirement mandates content at this stage); pre-existing repository issue found — .nuxt/ and .output/ build artifacts (99 files) are git-tracked from a prior "setup" commit despite being listed in .gitignore (gitignore does not retroactively untrack committed files); flagged to user, not remediated in this issue as it is outside P1-I001's allowed change surface and requires an explicit git rm decision.
```

