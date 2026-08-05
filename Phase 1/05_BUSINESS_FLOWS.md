# P1-FLOW — Business Flows

**Phase:** 1 · **Version:** 2.2 · **Owns:** Luồng nghiệp vụ end-to-end, state transition, publish, comment, analytics, abuse guard, contact và notification.
**Depends on:** [P1-SCOPE](01_PRODUCT_SCOPE_RELEASE.md), [P1-PUBLIC](03_PUBLIC_UX_AND_PRODUCT.md), [P1-ADMIN](04_ADMIN_RBAC_AND_SYSTEM_UI.md)

[← P1-ADMIN](04_ADMIN_RBAC_AND_SYSTEM_UI.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Đây là module trung tâm định nghĩa **state machine** cho mọi entity nghiệp vụ. `P1-DATA` phải map trực tiếp mỗi state ở đây thành cột/enum trong schema — không được tự phát minh state khác. `P1-API` phải expose transition đúng theo bảng dưới, không hơn không kém.

## 1. Story & Chapter lifecycle

### 1.1 Story states

```
DRAFT → PUBLISHED → ARCHIVED
           ↑___________|
           (unarchive → PUBLISHED)
```

| State | Ý nghĩa | Ai chuyển được |
|---|---|---|
| `DRAFT` | Đang soạn, không hiển thị public | ADMIN/SUPER_ADMIN |
| `PUBLISHED` | Hiển thị trong kho truyện public | ADMIN/SUPER_ADMIN |
| `ARCHIVED` | Ẩn khỏi kho truyện public, giữ dữ liệu | ADMIN/SUPER_ADMIN |

### 1.2 Chapter states

```
DRAFT → PUBLISHED → ARCHIVED
```

- Chapter chỉ **PUBLISHED** khi Story cha cũng ở trạng thái `PUBLISHED` (nếu Story chuyển `ARCHIVED`, mọi chapter con hiển thị theo trạng thái Story cha — không public dù chapter đang `PUBLISHED`).
- Publish một chapter tạo một **publication event** (xem mục 5) nếu đây là chapter mới hoặc thay đổi visibility từ non-public sang public.
- Publish/unpublish là **idempotent theo trạng thái đích**: gọi publish khi đã `PUBLISHED` không tạo event trùng (kiểm tra tại DB, không chỉ ở application layer).

### 1.3 Import TXT (bulk)

```
QUEUED → PROCESSING → (SUCCEEDED | FAILED | CANCELLED)
```

- Job có preview trước khi commit (không ghi chapter thật cho tới khi admin xác nhận).
- `PROCESSING` phải resumable: nếu worker restart giữa chừng, job tiếp tục từ chapter cuối đã ghi thành công, không ghi trùng (idempotency key theo job + thứ tự chapter).
- Admin có thể `CANCEL` khi đang `QUEUED` hoặc `PROCESSING`; hủy giữa chừng không để lại chapter DRAFT mồ côi (rollback phần chưa commit hoặc đánh dấu rõ ràng để dọn).
- Lỗi parse một file không làm hỏng toàn bộ batch — file lỗi ghi vào kết quả `FAILED` với lý do, các file hợp lệ khác vẫn xử lý tiếp.

## 2. User account lifecycle

```
REGISTERED (email chưa verify) → EMAIL_VERIFIED → ACTIVE
                                                  ↘ SUSPENDED (admin action, ngoài phạm vi tự động Phase 1)
```

- Đăng ký tạo tài khoản ở trạng thái `REGISTERED`; gửi email xác minh (token một lần, có hạn).
- Xác minh email chuyển `EMAIL_VERIFIED` → `ACTIVE`. Trước khi verify, user vẫn login được nhưng các hành động yêu cầu email xác thực (ví dụ subscription) bị chặn.
- Quên mật khẩu: token reset một lần, hết hạn theo thời gian cố định, vô hiệu ngay sau khi dùng hoặc khi user đổi mật khẩu qua kênh khác.
- Không tiết lộ qua thông điệp lỗi việc email có tồn tại trong hệ thống hay không (áp dụng cho cả đăng ký và quên mật khẩu).

## 3. Guest visitor identity & ownership

- Guest được cấp một **visitor token** (hash, không định danh cá nhân trực tiếp) khi tương tác lần đầu (like/comment/request). Token lưu phía client (cookie) và hash lưu server-side để đối chiếu ownership.
- Ownership theo visitor token áp dụng cho: like, comment, reply.
- **Cửa sổ sửa/xóa 15 phút**: tính từ `createdAt` của comment/reply. Sau 15 phút, kể cả đúng visitor token, hành động sửa/xóa bị từ chối ở API (403/409 tùy lỗi thiết kế tại `P1-API`), không chỉ ẩn UI.
- **Merge khi guest đăng ký/đăng nhập**: nếu visitor token có like/comment trước đó và người dùng sau đó tạo tài khoản, hệ thống gán lại (merge) các bản ghi đó cho `userId` mới — thực hiện trong transaction, idempotent (chạy merge nhiều lần không tạo trùng hoặc mất dữ liệu).

## 4. Comment & moderation flow

```
CREATED → PENDING (automated moderation) → (VISIBLE | REJECTED)
                                          ↘ (provider lỗi) → PENDING (giữ nguyên, fail-safe)
VISIBLE → (admin action) → REJECTED (soft-hide, giữ audit trail)
```

- Mọi comment/reply mới đi qua automated text moderation trước khi `VISIBLE`. Nếu provider timeout/429/5xx/malformed response: trạng thái giữ `PENDING`, **không được** tự động chuyển `VISIBLE` (fail-safe, khớp `P1-SCOPE §3.10`).
- Admin có quyền duyệt thủ công (`PENDING`/flagged → `VISIBLE` hoặc `REJECTED`) bất kể kết quả automated.
- `REJECTED` là soft-hide (ẩn khỏi public, giữ bản ghi cho audit) — không hard-delete dữ liệu comment vi phạm trừ khi có yêu cầu privacy riêng (xem `P1-SEC`).
- Sửa/xóa trong 15 phút của chính guest/user (mục 3) không cần qua lại moderation nếu chỉ là xóa; sửa nội dung phải chạy lại moderation.

## 5. Publication event & fan-out

```
Story/Chapter → PUBLISHED (transition) → publication event ghi vào outbox (cùng transaction)
                                        → worker đọc outbox → fan-out (email, Web Push, in-site bell)
```

- Event được ghi vào **outbox table** trong cùng transaction DB với thao tác publish — đảm bảo không mất event nếu request publish thành công.
- Fan-out **idempotent theo (event, kênh, subscriber)**: retry do lỗi tạm thời không gửi trùng thông báo cho cùng người nhận.
- Nếu `auto_send_notification_enabled` đang tắt: outbox event vẫn được ghi (để giữ lịch sử), nhưng worker không gửi email/Web Push hàng loạt. Khi bật lại, worker **không được** xả các event tồn đọng trong lúc tắt — chỉ xử lý event phát sinh sau thời điểm bật lại (khớp `P1-SCOPE §3.5`).
- Thông báo account/security/direct story-request (phản hồi trực tiếp cho một request cụ thể của một người) **không đi qua** cơ chế auto-send này — đây là notification cá nhân, luôn gửi bất kể flag.

## 6. Subscription & unsubscribe

```
UNVERIFIED → VERIFIED → (ACTIVE | UNSUBSCRIBED)
```

- Đăng ký nhận email cần xác minh (double opt-in) trước khi `ACTIVE`.
- Unsubscribe qua link trong email, không cần đăng nhập, hiệu lực ngay lập tức, idempotent (bấm nhiều lần không lỗi).
- Web Push subscription không cần bước verify riêng (đã opt-in qua trình duyệt) nhưng phải xử lý được subscription hết hạn/bị thu hồi (endpoint trả 404/410) bằng cách dọn subscription khỏi danh sách gửi.

## 7. Cost guard & quota (notification)

- Có quota gửi (email/Web Push) theo cấu hình free-tier của provider (`P1-INFRA` sở hữu con số cụ thể).
- Khi gần/đạt quota: ưu tiên email bắt buộc (account/security/direct request) trước, hoãn (defer) thông báo hàng loạt không bắt buộc; không tự động nâng cấp gói trả phí (khớp `P1-SCOPE §3.7` — no auto-overage).
- Trạng thái defer phải có cơ chế xử lý lại khi quota reset, không mất thông báo đã defer.

## 8. Tracking link & attribution

```
Tracking link CRUD (admin) → redirect request → attribution ghi visitor/session → analytics event
```

- Redirect qua tracking link phải nhanh (không chặn bởi ghi analytics đồng bộ nặng — ghi async/outbox theo `P1-ARCH §5`).
- Attribution gắn với visitor identity (mục 3) khi có thể; loại trừ bot theo pattern đã biết trước khi tính vào số liệu.
- Aggregate hằng ngày chạy như background job, không tính real-time trên mỗi request.

## 9. Abuse guard flow

```
Hoạt động bất thường (rate spike, spam pattern) → Risk score → (PENDING_REVIEW | AUTO_THROTTLE)
SUPER_ADMIN review → (BLOCK | CLEAR)
```

- Rate limit/CAPTCHA tự động can thiệp ở tầng request (chi tiết ngưỡng thuộc `P1-SEC`).
- Quyết định `BLOCK` một visitor/tài khoản dài hạn chỉ SUPER_ADMIN thực hiện qua UI (khớp `P1-ADMIN §1`), có audit log lý do.
- Block không hồi tố xóa nội dung đã tồn tại — chỉ chặn hành động tương lai, trừ khi admin xóa thủ công riêng.

## 10. Contact capture & consent

```
Contact được thu thập (story request, subscription) → Consent ledger ghi nhận (mục đích, thời điểm, nguồn)
```

- Mọi lần thu thập contact info (email, v.v.) phải ghi một bản ghi consent tương ứng (mục đích sử dụng, thời điểm, có thể thu hồi).
- Export/xóa dữ liệu cá nhân theo yêu cầu quyền riêng tư (chi tiết quy trình thuộc `P1-SEC`, workflow copyright/privacy thuộc `P1-I081`).

## 11. Ranh giới với module khác

- Tên bảng, cột, enum, index, constraint cho mọi state ở trên: `P1-DATA` (bắt buộc định nghĩa đầy đủ một lần, không chia nhỏ qua nhiều issue riêng biệt cho cùng một entity).
- Request/response shape cho từng transition: `P1-API`.
- Ngưỡng rate-limit/CAPTCHA cụ thể, mã hóa, quyền riêng tư chi tiết: `P1-SEC`.
- Ngân sách hạ tầng cho background worker: `P1-INFRA`.

Module này sở hữu **trình tự và điều kiện chuyển trạng thái**; không được định nghĩa lại ở module khác — nơi khác chỉ tham chiếu state đã đặt tên tại đây.
