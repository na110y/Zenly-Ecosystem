# P1-I001 — Khởi tạo Nuxt Nitro strict

**Stage:** foundation  
**Status:** TODO  
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
Canonical requirement sections:
Dependencies verified:
Exact files changed:
Migration/schema result:
API/UI result:
Unit/component tests:
Integration/contract tests:
E2E/security/performance tests:
Coverage delta:
Acceptance items satisfied:
Rollback/compensation:
Known limitations (no P0/P1):
```

