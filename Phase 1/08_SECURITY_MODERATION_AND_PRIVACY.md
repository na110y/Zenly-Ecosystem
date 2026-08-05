# P1-SEC — Security, Moderation & Privacy

**Phase:** 1 · **Version:** 2.2 · **Owns:** Security controls, spam/crawl defense, moderation policy, privacy, consent, encryption và data exposure rules.
**Depends on:** [P1-ADMIN](04_ADMIN_RBAC_AND_SYSTEM_UI.md), [P1-FLOW](05_BUSINESS_FLOWS.md), [P1-DATA](06_DATABASE_SCHEMA.md), [P1-API](07_API_CONTRACTS.md)

[← P1-API](07_API_CONTRACTS.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Đây là module cụ thể hóa các ngưỡng/thuật toán mà `P1-API` và `.claude/rules/api-security.md` tham chiếu. Không được nới lỏng invariant `P1-SCOPE §3.9` (admin bắt buộc password+TOTP) hoặc `§3.10` (moderation fail-safe).

## 1. Mã hóa & hashing

| Dữ liệu | Thuật toán | Ghi chú |
|---|---|---|
| Password (User, AdminAccount) | Argon2id (`argon2`) | Tham số tối thiểu theo khuyến nghị OWASP hiện hành cho Argon2id; không MD5/SHA1 thuần |
| TOTP secret | Mã hóa đối xứng (AES-256-GCM) trước khi lưu `AdminTotpCredential.secretEncrypted`, key quản lý qua biến môi trường (không hard-code) | Không lưu secret plaintext |
| Session token (User/Admin) | Random 256-bit, chỉ lưu **hash** (SHA-256) trong DB, giá trị thật chỉ nằm trong cookie httpOnly | Không thể phục hồi token gốc từ DB nếu bị đọc trộm |
| Email verification / password reset / unsubscribe token | Random 256-bit, hash lưu DB, có `expiresAt` | Một lần dùng — `consumedAt` set ngay sau khi dùng |
| Visitor token | Hash (không định danh cá nhân trực tiếp) | Theo `P1-DATA §7 VisitorIdentity` |
| IP (nếu lưu) | Hash, không lưu plaintext IP dài hạn | Dùng cho rate-limit/abuse signal, không dùng để định danh cá nhân |

## 2. CSRF, CORS, CSP

- **CSRF:** áp dụng cho mọi mutation dùng cookie session (`/api/user/*`, `/api/admin/*`, `/api/system/*`). Dùng double-submit token hoặc SameSite=Lax/Strict cookie kết hợp kiểm tra header origin — chọn một cơ chế nhất quán, áp dụng tại `P1-I080`.
- **CORS:** origin cho phép là domain chính thức của Zenly Stories; không wildcard `*` cho endpoint có cookie credential.
- **CSP:** header `Content-Security-Policy` chặn inline script không có nonce, chặn nguồn ảnh/script ngoài whitelist (self + domain ảnh/CDN đã khai báo). Không script-src `unsafe-eval`.

## 3. Rate limit & CAPTCHA

| Hành vi | Ngưỡng loại | Hành động khi vượt |
|---|---|---|
| Login (user/admin) | Giới hạn theo IP hash + theo tài khoản | Tăng dần cooldown; sau ngưỡng cao yêu cầu CAPTCHA |
| Tạo comment/reply/like (guest) | Giới hạn theo visitor token + IP hash trong cửa sổ thời gian ngắn | CAPTCHA hoặc từ chối tạm thời (`429`) |
| Story request / subscription | Giới hạn theo IP hash/email trong cửa sổ dài hơn | CAPTCHA |
| Endpoint public GET tần suất cao (feed, story list) | Giới hạn nới lỏng hơn, chủ yếu chống crawl abuse | Trả `429` kèm `Retry-After` |

- Ngưỡng số cụ thể (request/phút) cấu hình được qua `SystemSetting`, không hard-code trong route handler.
- Comment micro-batch: khi lưu lượng comment tăng đột biến trong khoảng thời gian ngắn, hệ thống có thể gộp xử lý moderation theo batch thay vì per-request đồng bộ — chi tiết cơ chế thuộc `P1-I049`, phải giữ nguyên tắc fail-safe của mục 5.

## 4. Abuse Guard (chi tiết kỹ thuật)

- `AbuseSignal` (xem `P1-DATA §12`) được ghi khi rate-limit bị chạm ngưỡng cao hoặc phát hiện pattern spam (nội dung lặp lại, tốc độ bất thường).
- `riskScore` tính từ trọng số các signal trong cửa sổ thời gian trượt; ngưỡng cụ thể cấu hình qua `SystemSetting`.
- Vượt ngưỡng cao → tự động throttle (giảm tốc độ cho phép) ngay lập tức; **không tự động** tạo `AbuseBlock` dài hạn — quyết định block cuối cùng luôn cần SUPER_ADMIN xác nhận qua UI (`P1-ADMIN §1`, `P1-FLOW §9`).

## 5. Automated content moderation

- Phạm vi Phase 1: **chỉ kiểm tra text** (comment, reply, feed post nếu user-posting bật). Không kiểm duyệt ảnh/audio (không có media user).
- Provider automated moderation nằm sau một adapter interface (`P1-ARCH §4`), không gọi SDK trực tiếp từ use case.
- **Fail-safe bắt buộc:** khi provider timeout, trả `429`, `5xx`, hoặc response không parse được (malformed):
  - Kết quả ghi vào `ModerationDecision` với `result = PENDING`.
  - Nội dung liên quan **giữ nguyên** `status = PENDING`, không tự động chuyển `VISIBLE`.
  - Không throw lỗi 500 cho người dùng cuối — request tạo comment vẫn thành công (trả `201`), chỉ là nội dung chưa hiển thị công khai ngay.
- Golden dataset (bộ test case chuẩn cho automated moderation) và adversarial test case thuộc phạm vi `P1-QA`; module này chỉ định nghĩa chính sách, không định nghĩa bộ test.
- Provider không bao giờ được dùng để tự kết luận vi phạm bản quyền — đó là quyết định thủ công của admin theo copyright workflow (mục 8).

## 6. Phân tách namespace phiên (nhắc lại thực thi)

- Middleware xác thực cho `/api/user/*` và `/api/admin/*` phải là hai middleware khác nhau, đọc cookie tên khác nhau (`UserSession` cookie ≠ `AdminSession` cookie).
- Test bảo mật bắt buộc: gọi trực tiếp API admin bằng cookie user hợp lệ phải trả `401`, không phải `403` che giấu nhầm là "đúng nhưng thiếu quyền" (để tránh lộ thông tin route tồn tại theo cách gây hiểu nhầm) — mã lỗi chính xác theo chuẩn tại `P1-API §2`.

## 7. Privacy & data exposure

- Không bao giờ trả qua API: `passwordHash`, session token thật, TOTP secret, `ModerationDecision.providerRaw`, IP thật (chỉ hash nội bộ), đường dẫn file server thật (`Chapter.contentPath` là internal, response API trả nội dung đã render hoặc URL đã ký/proxy, không trả path hệ thống).
- Log ứng dụng không được in giá trị các trường trên; log chỉ chứa `requestId`, action, kết quả, không chứa payload nhạy cảm nguyên văn.
- Contact info (email từ story request/subscription) chỉ dùng cho mục đích đã ghi trong `ConsentLedgerEntry.purpose`; không dùng chéo mục đích khác mà không có consent mới.

## 8. Export & copyright workflow (P1-I081)

- User/guest có quyền yêu cầu export dữ liệu cá nhân liên quan đến họ (comment, like, subscription, story request) — thực hiện thủ công bởi admin trong Phase 1 (không có self-service tự động export UI bắt buộc), nhưng phải có endpoint/khả năng kỹ thuật để admin trích xuất khi có yêu cầu.
- Yêu cầu xóa dữ liệu cá nhân: comment/reply có thể hard-delete theo yêu cầu privacy hợp lệ (khác với soft-delete thông thường ở `P1-FLOW §4`), nhưng phải giữ lại audit log về việc đã xóa (ai yêu cầu, khi nào), không giữ lại nội dung gốc.
- Copyright complaint: quy trình thủ công — admin nhận khiếu nại, xem xét, quyết định ẩn/xóa nội dung liên quan; hệ thống **không tự động** kết luận vi phạm bản quyền (khớp mục 5 và `P1-SCOPE §3.10`). Chi tiết tham chiếu pháp lý thuộc `P1-REF`.

## 9. Test bảo mật bắt buộc (tham chiếu P1-QA)

Theo `.claude/rules/testing.md`, mọi endpoint bảo vệ ở trên phải có test tấn công trực tiếp: cross-role access, ownership bypass (sửa comment người khác, sửa sau 15 phút), replay token đã dùng, payload abuse (field lạ, kích thước quá lớn), rò rỉ trường nhạy cảm trong response. Bộ test cụ thể và ngưỡng coverage thuộc `P1-QA`.

## 10. Ranh giới với module khác

- Route/DTO cụ thể áp dụng các control này: `P1-API`.
- Schema bảng lưu token/signal/decision: `P1-DATA`.
- Ma trận quyền role: `P1-ADMIN`.
- Ngân sách hiệu năng của rate-limit/cache liên quan crawler: `P1-PERF`.
- Nguồn tham chiếu pháp lý/kỹ thuật cho copyright: `P1-REF`.

Module này sở hữu **ngưỡng và thuật toán bảo mật cụ thể**; không định nghĩa lại route shape hay schema.
