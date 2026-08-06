# P1-I004 — Prisma migration và seed nền

**Stage:** foundation  
**Status:** DONE  
**Depends on:** 003  
**Canonical modules — read fully:** P1-DATA, P1-QA  
**Previous:** [P1-I003](./003_DOCKER_LOCAL_VOI_POSTGRESQL.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I005](./005_CHUAN_RESPONSE_LOI_VA_REQUEST_CONTEXT.md)

## Objective

Thiết lập hạ tầng migration Prisma (extension `pgcrypto`, quy ước chung tại `P1-DATA §1`) và cơ chế seed nền: `FeatureFlag` + `SystemSetting` (`P1-DATA §4`) với 4 flag bắt buộc seed `enabled = false`. **Không tạo bảng nghiệp vụ khác** (User, Story, Comment...) — các bảng đó thuộc phạm vi issue riêng của chúng (P1-I010, P1-I015, P1-I030...) theo đúng chú thích trong `P1-DATA` và `P1-ROADMAP §2` (WP-00 chỉ cần "PostgreSQL/Prisma local" chạy được, chưa cần business schema đầy đủ).

## Allowed change surface

`prisma/`; `tests/`. Không chỉnh sửa module nghiệp vụ khác.

## Required implementation

- `prisma/schema.prisma`: thêm `CREATE EXTENSION IF NOT EXISTS pgcrypto` (qua migration SQL, Prisma schema không có cú pháp extension trực tiếp nên dùng raw SQL trong migration hoặc `previewFeatures`/`extensions` block nếu Prisma 7 hỗ trợ — kiểm tra thực tế trước khi chọn cách).
- Model `FeatureFlag` và `SystemSetting` đúng cột/kiểu tại `P1-DATA §4`: `id UUID`, `key TEXT UNIQUE`, `enabled BOOLEAN`/`value JSONB`, `scope` enum (`FeatureFlag` only), `version INTEGER DEFAULT 1`, `updatedByAdminId` (FK tới `AdminAccount` — bảng này CHƯA tồn tại ở issue 004; do đó cột này phải nullable UUID **không có FK constraint thật** cho tới khi `P1-I015` tạo `AdminAccount`, hoặc issue này phải hoãn field đó — xem "Required implementation" quyết định dưới).
- Quyết định xử lý FK treo: `FeatureFlag.updatedByAdminId`/`SystemSetting.updatedByAdminId` tạo dạng `UUID NULL` không có `@relation` (chưa constraint FK) ở issue này; khi `P1-I015` tạo `AdminAccount` sẽ thêm migration bổ sung gắn FK thật — đây không phải sửa ngầm schema mà là bổ sung migration theo đúng expand-pattern của `.claude/rules/database.md` ("Migration forward-safe... không rewrite migration đã apply").
- Migration đặt tên rõ ràng (`pnpm exec prisma migrate dev --name init_feature_flags_settings`), chạy được với `db` container (`P1-I003`).
- Seed script (`prisma/seed.ts`, chạy qua `tsx`) tạo đúng 4 `FeatureFlag` row, tất cả `enabled = false`. `scope` xác định từ `P1-ADMIN §5` ("Chỉ SUPER_ADMIN thay đổi được các flag infra-sensitive và auto-send; các flag còn lại theo đúng bảng quyền mục 1") kết hợp `P1-SCOPE §3.5` ("chỉ SUPER_ADMIN được bật/tắt community feature flag và auto-send"):
  - `community_feature_enabled` → `SUPER_ADMIN_ONLY`
  - `auto_send_notification_enabled` → `SUPER_ADMIN_ONLY`
  - `user_posting_enabled` → `ADMIN_MANAGEABLE` (không được liệt kê là infra-sensitive/auto-send)
  - `user_reporting_enabled` → `ADMIN_MANAGEABLE` (không được liệt kê là infra-sensitive/auto-send)
- Seed phải **idempotent** (`upsert` theo `key`), chạy lại nhiều lần không tạo dòng trùng.
- Thêm script `package.json`: `prisma:migrate`, `prisma:seed` nếu chưa có (giữ `prisma:generate`/`prisma:validate` hiện có).

## Tests required in the same change

- Integration test dùng PostgreSQL thật (`@testcontainers/postgresql`, khớp `P1-QA §2`) — không SQLite: migration áp dụng thành công trên DB sạch.
- Integration test: seed chạy lần đầu tạo đúng 4 `FeatureFlag` với `enabled = false`.
- Integration test idempotency: chạy seed lần 2 không tạo thêm row (đếm lại = 4), không lỗi constraint.
- Integration test: `SystemSetting` bảng tồn tại đúng cột/kiểu (không cần seed row cụ thể vì `P1-DATA` không liệt kê seed bắt buộc cho `SystemSetting`).
- Unit test (nếu có logic thuần, ví dụ hàm xác định seed data) không phụ thuộc DB thật.

## Acceptance gate

- Dependency 003 DONE; canonical modules đọc đầy đủ.
- Migration + seed chạy qua PostgreSQL container thật (`P1-I003`), không mock.
- Không tạo bảng ngoài `FeatureFlag`/`SystemSetting` ở issue này.
- Typecheck, lint, integration test pass trên PostgreSQL thật; coverage không giảm dưới ngưỡng P1-QA.
- Rollback: migration mới có thể `prisma migrate resolve --rolled-back` hoặc tương đương; không có dữ liệu nghiệp vụ để mất ở bước này.

## Completion evidence

```text
Issue: P1-I004
Canonical requirement sections: P1-DATA §1 (UUID/pgcrypto convention, optimistic concurrency version column), §4 (FeatureFlag/SystemSetting columns, 4 required seed flags default false), §14 (pgcrypto extension); P1-ADMIN §5 + P1-SCOPE §3.5 (flag scope resolution: community_feature_enabled and auto_send_notification_enabled = SUPER_ADMIN_ONLY, the other two = ADMIN_MANAGEABLE); P1-QA §2 (real PostgreSQL integration tests via testcontainers, no SQLite)
Dependencies verified: 003 DONE
Exact files changed: prisma/schema.prisma (FeatureFlag, SystemSetting models + pgcrypto extension + postgresqlExtensions preview feature), prisma/migrations/20260805154114_init_feature_flags_settings/migration.sql (new), prisma/client.ts (new, createPrismaClient using @prisma/adapter-pg — required by Prisma 7's driver-adapter model, datasource url can no longer live in schema.prisma), prisma/seed.ts (new, pure seedFeatureFlags function + REQUIRED_FEATURE_FLAGS), prisma/seed-cli.ts (new, thin CLI entrypoint calling seedFeatureFlags — split out because a file://-vs-argv[1] "is this the entrypoint" guard is unreliable on Windows and caused the seed to silently no-op when invoked via tsx), prisma.config.ts (fixed: migrate.url is not a valid Prisma 7 config key, moved to datasource.url; removed hardcoded change_me fallback), package.json (added prisma:migrate, prisma:seed scripts; added @prisma/adapter-pg@7.9.1 exact-pinned dependency, required for Prisma 7 to connect at all), tests/prisma/migration-seed.test.ts (new)
Migration/schema result: migration 20260805154114_init_feature_flags_settings applied cleanly to both local db container (docker compose) and an ephemeral testcontainers PostgreSQL 17 instance; creates pgcrypto extension, FeatureFlagScope enum, FeatureFlag and SystemSetting tables exactly matching P1-DATA §4 column-for-column
API/UI result: none
Unit/component tests: none required beyond integration (no pure business logic split out at this layer)
Integration/contract tests: tests/prisma/migration-seed.test.ts (4 cases, real PostgreSQL via testcontainers, node environment): migration creates both tables empty; seed creates exactly 4 flags all enabled=false with correct scope per flag; re-running seed twice does not duplicate rows (idempotency proof, not just re-running the same function call in isolation — asserts durable DB state after two real upserts); SystemSetting accepts and round-trips a JSONB value
E2E/security/performance tests: manual end-to-end verification against the real local db container (not just the ephemeral test container): prisma migrate deploy confirmed already-applied/no-op, pnpm prisma:seed populated exactly the 4 expected rows with correct enabled/scope values (verified via psql SELECT), re-running seed confirmed idempotent (still 4 rows). e2e/smoke.spec.ts (P1-I001) and docker app boot (P1-I003) re-verified green after this change.
Coverage delta: unchanged from P1-I002 baseline (96.29% line / 90.9% branch) — prisma/** is intentionally outside vitest.config.ts coverage include scope (app/**, server/** only), consistent with this being infra tooling, not application business logic; all 27 tests across 4 files pass
Acceptance items satisfied: (1) dependency 003 DONE, canonical modules read in full; (2) migration+seed executed through real PostgreSQL (testcontainers ephemeral instance AND the actual local docker db), not mocked; (3) only FeatureFlag/SystemSetting created, no business tables added ahead of their owning issues; (4) typecheck/lint/format/coverage/build/cycles/e2e all pass; (5) rollback documented below
Rollback/compensation: this is the first migration in the project (no prior migration to preserve); rollback = drop the migration's tables/enum/extension via a new down-migration or `prisma migrate resolve --rolled-back <name>` followed by manual DROP TABLE/DROP TYPE/DROP EXTENSION if needed — no business data exists yet so no data-loss risk from rollback at this stage
Known limitations (no P0/P1): FeatureFlag.updatedByAdminId and SystemSetting.updatedByAdminId are UUID columns without a live FK constraint yet, because AdminAccount does not exist until P1-I015 — this is the documented expand-pattern from .claude/rules/database.md (add FK via a new migration once the referenced table exists), not a defect; audit-logged flag updates and admin API enforcement are out of scope for this issue and land with P1-I018/P1-I020
```
