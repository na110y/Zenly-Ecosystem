# P1-I018 — RBAC middleware và menu theo role

**Stage:** identity  
**Status:** DONE  
**Depends on:** 017  
**Canonical modules — read fully:** P1-ADMIN, P1-API, P1-SEC  
**Previous:** [P1-I017](./017_DANG_NHAP_ADMIN_BAT_BUOC_TOTP.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I019](./019_QUAN_TRI_ADMIN_VA_BAO_VE_SUPER_ADMIN_CUOI.md)

## Objective

Triển khai enforcement RBAC phía server cho namespace `/api/system/*` theo `P1-API §1`: yêu cầu như `/api/admin/*` (AdminSession + `totpVerifiedAt IS NOT NULL`) **và** `role = SUPER_ADMIN`, trả `403` nếu role là `ADMIN`. Bổ sung một guard dùng chung (`requireSuperAdmin`) song song với `requireVerifiedAdmin` (`P1-I017`) để các route CMS/System tương lai gọi tại đầu handler. Cung cấp cấu trúc dữ liệu điều khiển System menu phía server (không phải middleware ẩn UI) theo `P1-ADMIN §4`: System navigation (settings, feature flags, quản trị admin, abuse guard) chỉ trả về/hiển thị cho SUPER_ADMIN; CMS (truyện/chương/moderation/analytics) hiển thị cho cả ADMIN và SUPER_ADMIN — nhưng **API luôn là nguồn enforcement thật**, menu chỉ là trình bày.

## Allowed change surface

`server/admin/`; `server/api/system/` (chỉ tạo một route xác minh tối thiểu để chứng minh guard hoạt động thật qua HTTP — không tạo toàn bộ CMS/System API, các route nghiệp vụ cụ thể thuộc các issue sau như `P1-I020`, `P1-I031`); `app/composables/` (một composable tối thiểu trả cấu trúc menu theo role, chỉ dùng dữ liệu role đã biết từ API, không tự quyết định quyền); `tests/`.

## Required implementation

- `requireSuperAdmin(event)` trong `server/admin/`: gọi `requireVerifiedAdmin(event)` trước (tái dùng `P1-I017`, đảm bảo 401/403 cho các điều kiện admin cơ bản không bị lặp lại logic), sau đó kiểm tra `context.role === 'SUPER_ADMIN'`; nếu không, `403`. Trả về `AdminContext` đã xác minh nếu hợp lệ.
- Một route xác minh tối thiểu `GET /api/system/whoami` (hoặc tên tương đương rõ ràng là route xác minh, không phải nghiệp vụ thật) dùng `requireSuperAdmin` — mục đích duy nhất là chứng minh guard hoạt động đúng qua HTTP thật (401/403/200), không phải tính năng System UI thật. Các route System nghiệp vụ thật (feature flags, quản trị admin...) thuộc các issue sau.
- Cấu trúc menu theo role: một hàm/composable thuần (`server/admin/` cho phần server nếu cần trả về từ API, hoặc `app/composables/useAdminMenu.ts` cho phần client) nhận `role: 'ADMIN' | 'SUPER_ADMIN'` và trả về danh sách mục menu đã lọc đúng `P1-ADMIN §4` (CMS luôn có; System nav chỉ khi SUPER_ADMIN). Đây thuần là trình bày — không dùng để quyết định quyền, chỉ để tránh render nhầm mục menu mà bấm vào sẽ nhận `403` từ API.
- Không tạo lại logic đã có: không sửa `requireVerifiedAdmin`, không sửa middleware `resolve-admin-session` (`P1-I017`).

## Tests required in the same change

- Unit: `requireSuperAdmin` — cho qua khi role `SUPER_ADMIN` và đã verified; `403` khi role `ADMIN` dù đã verified; `403`/`401` đúng như `requireVerifiedAdmin` khi chưa verified/không có context (ủy quyền logic, không lặp lại).
- Unit: hàm/composable menu theo role — `ADMIN` chỉ thấy mục CMS; `SUPER_ADMIN` thấy cả CMS và System nav; không có mục nào bị lộ sai role.
- Integration (real h3/HTTP): `GET /api/system/whoami` — `401` không có session; `403` có session admin nhưng chưa hoàn tất TOTP; `403` đã hoàn tất TOTP nhưng role `ADMIN`; `200` khi role `SUPER_ADMIN` và đã hoàn tất TOTP.
- Security test: gọi trực tiếp API bỏ qua UI — xác nhận ẩn menu không thay thế được kiểm tra role thật ở API (role `ADMIN` gọi thẳng route System vẫn nhận `403` bất kể menu client hiển thị gì).

## Acceptance gate

- Dependency 017 DONE; canonical modules đọc đầy đủ.
- Enforcement `/api/system/*` hoạt động đúng qua HTTP thật (401/403/200 theo đúng bảng `P1-API §1`).
- Typecheck, lint, unit/integration/security test pass.
- Coverage không giảm dưới ngưỡng P1-QA; nhánh role ADMIN/SUPER_ADMIN của `requireSuperAdmin` đạt 100%.
- Không render nhầm menu System cho ADMIN (test), nhưng đây chỉ là trình bày — enforcement thật luôn ở API.
- Rollback: thuần code, không migration mới (dùng `AdminAccount.role` đã có từ `P1-I015`).

## Completion evidence

```text
Issue: P1-I018
Canonical requirement sections: P1-ADMIN §1 (RBAC matrix, three fully separate roles, server-side enforcement mandatory), §4 (System nav visible only to SUPER_ADMIN; CMS visible to ADMIN+SUPER_ADMIN; client role checks are presentation only); P1-API §1 (namespace table: /api/system/* requires everything /api/admin/* requires, plus role = SUPER_ADMIN, 403 if role = ADMIN); P1-SEC (namespace isolation unchanged, reused as-is from P1-I016/P1-I017).
Dependencies verified: P1-I017 Status: DONE (confirmed via issue_context.py 018 — Ready: YES).
Exact files changed:
  - Phase 1/Issues/018_RBAC_MIDDLEWARE_VA_MENU_THEO_ROLE.md (new — this issue's file did not exist despite being referenced by 00_ISSUE_INDEX.md; drafted from the Master plan + P1-ADMIN/P1-API before implementation, per the same explicit user decision applied to P1-I017)
  - Phase 1/Issues/00_ISSUE_INDEX.md (status TODO -> IN_PROGRESS -> DONE for row 018)
  - server/admin/require-super-admin.ts (new — delegates to requireVerifiedAdmin from P1-I017 first, so 401/403-TOTP logic is not duplicated, then checks role === 'SUPER_ADMIN', 403 otherwise)
  - server/api/system/whoami.get.ts (new — minimal verification route, not a real System feature; sole purpose is proving the guard enforces the full /api/system/* chain over real HTTP)
  - app/composables/useAdminMenu.ts (new — pure function, role -> filtered menu item list; CMS items always included, System nav items only for SUPER_ADMIN; returns fresh arrays each call, not shared mutable state)
  - tests/admin/require-super-admin.test.ts (new, 4 tests)
  - tests/admin/system-whoami-route.test.ts (new, 5 tests, real h3+HTTP)
  - tests/composables/useAdminMenu.test.ts (new, 3 tests)
Migration/schema result: No new migration — AdminAccount.role (enum ADMIN|SUPER_ADMIN) already exists from P1-I015; this issue only reads it.
API/UI result:
  - GET /api/system/whoami: 401 with no AdminSession cookie; 403 when session exists but totpVerifiedAt is still NULL (delegates through requireVerifiedAdmin, same as any /api/admin/* route would behave); 403 when TOTP is complete but role is ADMIN; 200 with { adminAccountId, role } when role is SUPER_ADMIN and TOTP is complete. This is the first real route to actually enforce the /api/system/* row of P1-API §1's namespace table end-to-end.
  - useAdminMenu(role): pure client-side menu-item filter. Verified it is presentation-only by design (the route test above proves an ADMIN calling the System API directly still gets 403 regardless of what the menu would show) — matches P1-ADMIN §4's explicit "hiding UI is never authorization" framing carried over from P1-SCOPE §3.4.
Unit/component tests:
  - tests/admin/require-super-admin.test.ts (4): SUPER_ADMIN+verified passes; ADMIN role rejected (403) even when verified; SUPER_ADMIN but not yet TOTP-verified rejected (403, inherited from requireVerifiedAdmin); no context at all rejected (401).
  - tests/composables/useAdminMenu.test.ts (3): ADMIN sees only CMS items, never System items; SUPER_ADMIN sees both; menu arrays are not shared/mutable between calls (mutating one call's result does not leak into the next).
Integration/contract tests:
  - tests/admin/system-whoami-route.test.ts (5, real h3+HTTP, layered on the P1-I016/P1-I017 middleware+guards): 401 no cookie; 403 session exists but TOTP incomplete; 403 TOTP complete but role ADMIN; 200 TOTP complete and role SUPER_ADMIN; UserSession cookie never accepted (401, proving cross-namespace isolation still holds through this additional guard layer).
E2E/security/performance tests:
  - Security assertion embedded in system-whoami-route.test.ts: a role=ADMIN account calling the System route directly (bypassing any UI menu state) still receives 403 — proving enforcement lives at the API, not the menu.
  - No real-PostgreSQL integration test added for this issue: requireSuperAdmin and useAdminMenu are pure functions operating entirely on already-resolved AdminContext/role values (no new database read/write introduced — AdminAccount.role is read via the same resolveAdminSession path already covered by P1-I017's real-PostgreSQL test). Adding a DB-backed test here would exercise no new persistence logic.
  - No Playwright E2E spec: same rationale as P1-I016/P1-I017 — this issue introduces no new UI screen, only a menu-filtering composable and a verification-only API route; the real-h3-HTTP test already exercises the complete enforcement contract.
Coverage delta: Full suite 304/304 passing (up from 292 after P1-I017). Overall coverage 94.43% lines / 92.82% branches / 84.37% functions — above the P1-QA minimum (90% line / 85% branch). require-super-admin.ts and useAdminMenu.ts both at 100% line coverage; the SUPER_ADMIN/ADMIN role branch in requireSuperAdmin is covered by both unit and real-HTTP tests.
Acceptance items satisfied:
  - Dependency 017 DONE; canonical modules (P1-ADMIN, P1-API, P1-SEC) read fully; issue_context.py 018 confirmed Ready: YES before implementation.
  - /api/system/* enforcement verified end-to-end over real HTTP (401/403/403/200 per P1-API §1's table).
  - Typecheck, lint, format, full test suite (test:coverage), build, and check:cycles all pass with exit code 0.
  - Coverage above P1-QA thresholds; ADMIN/SUPER_ADMIN role branch at 100%.
  - No menu-hiding-as-authorization regression: the security test proves API enforcement is independent of menu state.
Rollback/compensation: Pure code change, no new migration (reuses P1-I015's AdminAccount.role column as-is). Rollback is a plain revert of the listed files; no data migration or compensation needed.
Known limitations (no P0/P1):
  - GET /api/system/whoami is a minimal verification route only, not a real System feature — the actual System UI routes (feature flags, admin account management, abuse guard) are explicitly out of this issue's scope and belong to P1-I019/P1-I020 and later.
  - useAdminMenu currently returns a static list of known Phase-1 menu keys (stories, moderation, analytics, system-settings, feature-flags, admin-accounts, abuse-guard) matching P1-ADMIN §1/§4's described capabilities; it is not yet wired to any real navigation UI component, since no System/CMS page shell exists yet (that is System UI issue scope, P1-I020+).
  - This issue does not add role-based enforcement to any CMS route (stories/chapters/moderation/analytics), since none of those routes exist yet — only requireVerifiedAdmin (P1-I017) and the new requireSuperAdmin are available for future issues (P1-I020, P1-I031, etc.) to call.
```
