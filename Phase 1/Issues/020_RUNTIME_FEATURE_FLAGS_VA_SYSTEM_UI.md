# P1-I020 — Runtime feature flags và System UI

**Stage:** identity  
**Status:** IN_PROGRESS  
**Depends on:** 018, 019  
**Canonical modules — read fully:** P1-ADMIN, P1-DATA, P1-API  
**Previous:** [P1-I019](./019_QUAN_TRI_ADMIN_VA_BAO_VE_SUPER_ADMIN_CUOI.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I031](./031_ADMIN_CRUD_BO_TRUYEN.md)

## Objective

Triển khai `GET /api/system/feature-flags` và `PATCH /api/system/feature-flags/:key` theo `P1-API §10`/`P1-ADMIN §5`: đọc/ghi 4 `FeatureFlag` tối thiểu Phase 1 (`user_posting_enabled`, `user_reporting_enabled` — scope `ADMIN_MANAGEABLE`; `community_feature_enabled`, `auto_send_notification_enabled` — scope `SUPER_ADMIN_ONLY`, đã seed từ `P1-I004`), enforcement quyền theo `scope` (không phải theo route — cùng route nhưng quyền khác nhau theo từng flag), optimistic concurrency qua `expectedVersion`/`version`, audit log mọi thay đổi. Bổ sung UI System tối thiểu hiển thị danh sách flag + toggle, và cập nhật `useAdminMenu` (`P1-I018`) để menu System trỏ tới trang thật này thay vì placeholder.

## Allowed change surface

`server/admin/`; `server/api/system/feature-flags/`; `app/pages/system/` (trang feature flags tối thiểu); `app/composables/` (composable fetch/toggle flag, không đổi `useAdminMenu` cấu trúc dữ liệu — chỉ nối route thật nếu cần); `tests/`.

## Required implementation

- `GET /api/system/feature-flags`: yêu cầu `requireVerifiedAdmin` (`P1-I017`) — **không** `requireSuperAdmin`, vì ADMIN cần đọc được cả 4 flag để biết trạng thái hiện tại (ẩn nút không phải authorization, nhưng đọc trạng thái để hiển thị đúng UI là hợp lệ cho cả hai role theo `P1-ADMIN §9`). Trả về toàn bộ `FeatureFlag` (key, enabled, scope, version) — không lộ `updatedByAdminId` dạng nội bộ nếu không cần thiết, có thể trả kèm nếu hữu ích cho UI audit nhẹ.
- `PATCH /api/system/feature-flags/:key`: yêu cầu `requireVerifiedAdmin`. Trong handler, đọc `FeatureFlag.scope` của key tương ứng — nếu `scope = SUPER_ADMIN_ONLY` thì bổ sung kiểm tra `context.role === 'SUPER_ADMIN'` (403 nếu không), nếu `scope = ADMIN_MANAGEABLE` thì ADMIN/SUPER_ADMIN đều được (đúng `P1-ADMIN §1`/`§5`: quyền theo scope của từng flag, không phải theo route tĩnh). Body gồm `enabled: boolean` và `expectedVersion: number`. Nếu `expectedVersion !== version` hiện tại trong DB → `409 CONFLICT`, không ghi. Ghi thành công tăng `version`, set `updatedByAdminId`, `updatedAt`, và tạo `AdminAuditLog` (`action: 'FEATURE_FLAG_UPDATE'`, `beforeValue`/`afterValue` chứa `enabled` cũ/mới).
- Không triển khai `GET|PATCH /api/system/settings/:key` (SystemSetting) ở issue này — cùng pattern nhưng là dữ liệu khác, để issue riêng nếu cần trước khi có tính năng thật sự dùng `SystemSetting` (không tạo API cho model chưa có consumer thật, tránh đoán shape `value JSONB` khi chưa biết dùng cho gì).
- UI System tối thiểu (`app/pages/system/feature-flags.vue` hoặc tương đương): danh sách 4 flag, hiển thị trạng thái hiện tại, toggle cho từng flag mà role hiện tại được phép sửa (ẩn/disable toggle cho flag `SUPER_ADMIN_ONLY` nếu đang đăng nhập là ADMIN — presentation only, API vẫn enforce thật). Đủ 5 trạng thái async theo `P1-ADMIN §9`. Gọi `GET` trước để lấy `version` hiện tại, gửi kèm khi `PATCH`; nếu nhận `409` thì fetch lại và báo lỗi rõ ràng cho người dùng thử lại (không tự động retry im lặng).
- Không đổi cấu trúc `useAdminMenu` (`P1-I018`) — chỉ đảm bảo entry `feature-flags` trỏ đúng route trang mới nếu trang dùng static route path khác giả định ban đầu.

## Tests required in the same change

- Unit: quyền theo scope — `ADMIN_MANAGEABLE` cho phép cả ADMIN và SUPER_ADMIN; `SUPER_ADMIN_ONLY` chặn ADMIN (403), cho phép SUPER_ADMIN.
- Unit: optimistic concurrency — `expectedVersion` khớp thì ghi thành công và tăng `version`; không khớp thì `409`, không ghi, không tăng `version`.
- Unit: audit log ghi đúng `beforeValue`/`afterValue` cho mỗi lần toggle.
- Integration PostgreSQL thật: hai request đồng thời cùng sửa một flag với cùng `expectedVersion` ban đầu — tối đa một request thành công, request còn lại nhận `409` (race safety thật qua version check, không giả lập tuần tự).
- Security test: ADMIN gọi trực tiếp API `PATCH` một flag `SUPER_ADMIN_ONLY` (bỏ qua UI) — `403`; `UserSession` không được chấp nhận.
- Component test: UI ẩn/disable toggle cho flag `SUPER_ADMIN_ONLY` khi role là ADMIN; hiển thị lỗi rõ ràng khi nhận `409` từ API.

## Acceptance gate

- Dependencies 018, 019 DONE; canonical modules đọc đầy đủ.
- Enforcement quyền theo `scope` từng flag (không phải theo route) hoạt động đúng qua HTTP thật.
- Optimistic concurrency chứng minh đúng dưới điều kiện đồng thời thật qua PostgreSQL thật.
- Typecheck, lint, unit/integration/security/component test pass.
- Coverage không giảm dưới ngưỡng P1-QA; nhánh ADMIN_MANAGEABLE/SUPER_ADMIN_ONLY và match/mismatch version đạt 100%.
- UI đủ 5 trạng thái bắt buộc; ẩn toggle không thay thế enforcement API.
- Rollback: thuần code, không migration mới (dùng schema `FeatureFlag` đã có từ `P1-I004`, dữ liệu đã seed).

## Completion evidence — fill before DONE

```text
Issue: P1-I020
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
