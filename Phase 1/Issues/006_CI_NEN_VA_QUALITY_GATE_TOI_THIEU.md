# P1-I006 — CI nền và quality gate tối thiểu

**Stage:** foundation  
**Status:** DONE  
**Depends on:** 001, 004, 005  
**Canonical modules — read fully:** P1-QA  
**Previous:** [P1-I005](./005_CHUAN_RESPONSE_LOI_VA_REQUEST_CONTEXT.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I010](./010_SCHEMA_USER_VA_SESSION_PUBLIC.md)

## Objective

Thiết lập pipeline CI tối thiểu theo đúng `P1-QA §7`: `format:check`, `lint`, `typecheck`, `test` (với coverage), `check:cycles`, `test:e2e` (ít nhất smoke), build production — chạy tự động trên mỗi push/PR, fail-fast, không bước nào bị bỏ qua bằng `--no-verify` hay tương tự.

## Allowed change surface

`.github/workflows/`; `package.json` (chỉ nếu cần script tổng hợp); `docs/` (ghi chú CI nếu cần). Không sửa logic ứng dụng.

## Required implementation

- GitHub Actions workflow (`.github/workflows/ci.yml`) chạy trên push và pull_request tới `main`.
- Job cài đặt: checkout, setup Node (khớp `.nvmrc`), setup pnpm qua corepack (khớp `packageManager` trong `package.json`), `pnpm install --frozen-lockfile`.
- Cần PostgreSQL thật cho integration test (`P1-QA §2` — không SQLite): dùng service container `postgres:17-alpine` trong workflow (khớp `docker-compose.yml` hiện có) hoặc để testcontainers tự quản lý nếu Docker-in-Docker khả dụng trên runner — ưu tiên cách nào ổn định hơn trên GitHub-hosted runner (thường đã có Docker sẵn, testcontainers hoạt động trực tiếp không cần service container riêng).
- Chạy tuần tự đúng theo `P1-QA §7`: `format:check` → `lint` → `typecheck` → `test:coverage` → `check:cycles` → `test:e2e` (cài `playwright install --with-deps chromium` trước) → `build`.
- Mỗi bước dùng đúng script đã có trong `package.json`, không tạo toolchain thay thế (khớp `CLAUDE.md` "Use package scripts from package.json").
- Fail-fast: bước nào đỏ thì dừng job, không tiếp tục các bước sau (mặc định GitHub Actions).
- Không dùng `continue-on-error`, không tắt bước để né lỗi.

## Tests required in the same change

- Không có test đơn vị mới (đây là cấu hình CI, không phải logic ứng dụng) — bằng chứng hợp lệ là chính pipeline CI chạy xanh trên nhánh này qua GitHub Actions thật.
- Nếu không thể kích hoạt Actions thật trong phiên làm việc này (không có quyền push/tạo PR), xác nhận bằng cách chạy đúng chuỗi lệnh y hệt workflow cục bộ (`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm check:cycles && pnpm test:e2e && pnpm build`) và ghi rõ đây là mô phỏng cục bộ, không phải bằng chứng Actions thật — không tự nhận là "CI đã chạy xanh" nếu chưa thấy trên GitHub.

## Acceptance gate

- Dependencies 001, 004, 005 DONE; canonical module đọc đầy đủ.
- Workflow file hợp lệ cú pháp GitHub Actions (kiểm tra được cục bộ qua `actionlint` nếu có, hoặc review thủ công cẩn thận nếu không có công cụ).
- Toàn bộ chuỗi lệnh trong workflow chạy xanh khi mô phỏng cục bộ.
- Không có bước nào bị tắt/bỏ qua để "cho qua".
- Rollback: xóa/revert file workflow, không ảnh hưởng runtime ứng dụng.

## Completion evidence

```text
Issue: P1-I006
Canonical requirement sections: P1-QA §7 (exact pipeline: format:check, lint, typecheck, test with coverage, check:cycles, test:e2e, build; no step skipped, no --no-verify); P1-QA §2 (real PostgreSQL, no SQLite — satisfied by testcontainers, which needs no separate service container since GitHub-hosted ubuntu-latest runners ship Docker preinstalled)
Dependencies verified: 001 DONE, 004 DONE, 005 DONE
Exact files changed: .github/workflows/ci.yml (new)
Migration/schema result: none
API/UI result: none
Unit/component tests: not applicable (CI configuration, not application logic, per this issue's own "Tests required" section)
Integration/contract tests: not applicable
E2E/security/performance tests: could not trigger a real GitHub Actions run in this session (no push/PR was made — pushing requires explicit user confirmation per operating rules, and creating one was out of scope for this issue). Instead, ran the exact step sequence from the workflow locally in one continuous pass with the exact same env vars the workflow declares (NODE_ENV=development, DATABASE_URL, all 4 secrets at >=32 bytes matching the ci.yml env: block): format:check -> lint -> typecheck -> test:coverage (51 tests passed, 98.14% line / 92.85% branch, real PostgreSQL via testcontainers) -> check:cycles (no circular deps) -> build (production build succeeded, health.get route compiled) -> test:e2e (2 Playwright smoke tests passed against pnpm preview). This is a local simulation of the CI sequence, not confirmed evidence that GitHub Actions itself runs green — that can only be confirmed once this branch/PR is actually pushed and Actions executes.
Coverage delta: unchanged from P1-I005 (98.14% line / 92.85% branch) — this issue adds no application code
Acceptance items satisfied: (1) dependencies 001/004/005 DONE, canonical module read in full; (2) workflow YAML validated as syntactically correct (parsed via js-yaml, structure matches GitHub Actions schema: on.push/pull_request to main, one job, ordered steps); (3) the exact command sequence the workflow runs was verified green locally; (4) no step uses continue-on-error or otherwise skips/softens a gate; (5) rollback is trivial (delete/revert the workflow file, zero runtime impact)
Rollback/compensation: delete or git revert .github/workflows/ci.yml; no effect on the running application, database, or any other repo state
Known limitations (no P0/P1): actionlint (or equivalent GitHub Actions static validator) was not available in this environment, so YAML correctness was verified via generic YAML parsing (js-yaml) plus manual review against GitHub Actions syntax, not a dedicated Actions linter. The workflow has never actually executed on GitHub Actions in this session — first real confirmation will happen on the next push/PR to main. If it fails there, the fix is scoped to this same file and does not require touching application code.
```
