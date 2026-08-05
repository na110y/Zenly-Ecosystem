# P1-FUTURE — Future Evolution (Phase 2+)

**Phase:** 1 · **Version:** 2.2 · **Owns:** Ranh giới Phase 2+, VIP image, 3D và điều kiện tách service; không được kéo ngược vào Phase 1.
**Depends on:** [P1-SCOPE](01_PRODUCT_SCOPE_RELEASE.md), [P1-ARCH](02_ARCHITECTURE_CODEBASE.md), [P1-DATA](06_DATABASE_SCHEMA.md)

[← P1-ACCEPT](13_ACCEPTANCE_AND_RELEASE_CHECKLIST.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Module này **không cấp phép** triển khai bất kỳ mục nào dưới đây trong Phase 1. Nó tồn tại để: (1) ghi lại ranh giới đã biết trước cho tương lai, (2) đảm bảo thiết kế Phase 1 không vô tình chặn đường mở rộng hợp lý sau này. Không issue Phase 1 nào được viện dẫn module này để mở rộng phạm vi.

## 1. Nguyên tắc

- Mọi mục ở đây là **có thể xảy ra ở Phase 2 trở đi**, không phải cam kết. Không được coi là roadmap chính thức đã duyệt ngân sách/thời gian.
- Nếu một quyết định kiến trúc Phase 1 khiến một mục dưới đây trở nên bất khả thi hoặc cực kỳ tốn kém để thêm sau, đó là tín hiệu cần rà soát lại quyết định đó tại `P1-ARCH`/`P1-DATA` — nhưng không được **thực hiện trước** phần mở rộng chỉ để "chuẩn bị sẵn".
- Không tạo cột/bảng/flag "phòng khi Phase 2 cần" trong schema Phase 1 (vi phạm nguyên tắc "no speculative edits" của `CLAUDE.md`).

## 2. User-generated media (VIP)

- Phase 2+ có thể cho phép user VIP đăng tối đa 4 ảnh WebP 1080×1080 kèm thumbnail 540×540 trong bài đăng cộng đồng.
- Điều kiện tiên quyết trước khi triển khai: có cơ chế thanh toán/VIP (ngoài phạm vi Phase 1), có chiến lược lưu trữ ảnh user-uploaded với kiểm duyệt hình ảnh (ngoài phạm vi automated text-only moderation của Phase 1 — xem `P1-SEC §5`), và đánh giá lại ngân sách VPS 2 GB cho storage/bandwidth ảnh.
- Phase 1 **không** lưu trữ, không xử lý, không hiển thị media do user tải lên trong bất kỳ luồng nào.

## 3. Payment / VIP subscription

- Chưa có trong Phase 1 dưới bất kỳ hình thức nào (không billing, không entitlement, không "coming soon" UI thu thập thanh toán trước).
- Khi triển khai Phase 2+: cần đánh giá riêng về PCI/tuân thủ thanh toán, không tái sử dụng schema Phase 1 mà không rà soát bảo mật riêng cho dữ liệu tài chính.

## 4. Marketplace / 3D / commerce

- Ngoài phạm vi mọi giai đoạn gần — không có timeline cụ thể. Ghi nhận là hướng có thể cân nhắc rất xa, không ảnh hưởng thiết kế Phase 1/Phase 2 gần.

## 5. Mobile app

- Phase 1 chỉ có web responsive/PWA (`P1-PERF §7`). App native/hybrid là quyết định riêng biệt của giai đoạn sau, không giả định trước bất kỳ API "mobile-specific" nào trong Phase 1.

## 6. Chat thời gian thực

- Không có trong Phase 1 (không WebSocket/realtime infra). Nếu triển khai sau, đây là điểm **duy nhất** có thể biện minh việc thêm thành phần hạ tầng mới (ví dụ pub/sub) — nhưng phải đánh giá lại toàn bộ nguyên tắc "small-VPS-first" tại `P1-ARCH §6` trước khi quyết định, có thể cần nâng cấp hạ tầng chứ không chỉ thêm dependency.

## 7. AI sinh nội dung

- Phase 1 chỉ dùng AI cho automated text moderation (`P1-SEC §5`). Không AI sinh truyện, ảnh, audio trong Phase 1.
- Nếu Phase 2+ cân nhắc tính năng này, cần chính sách bản quyền/nội dung riêng — không tái sử dụng automated moderation adapter cho mục đích sinh nội dung.

## 8. Điều kiện tách service (khi nào được phép rời khỏi modular monolith)

Modular monolith (`P1-ARCH §1`) chỉ nên tách thành nhiều service khi **đồng thời** các điều kiện sau xuất hiện (không tách sớm vì lý do lý thuyết):

1. Một module cụ thể (ví dụ notification fan-out, analytics) có đặc tính tải/scaling khác biệt rõ rệt so với phần còn lại, đo được bằng dữ liệu vận hành thật (không phải dự đoán).
2. Ngân sách hạ tầng đã vượt quá những gì một VPS 2 GB đáp ứng được cho toàn bộ hệ thống gộp chung, có bằng chứng từ `P1-INFRA` resource guard.
3. Có kế hoạch vận hành cụ thể cho service thứ hai (deploy, monitoring, backup) — không tách ra rồi để service đó không có quy trình vận hành tương đương service chính.

Khi điều kiện trên hội đủ, đây vẫn là **quyết định thay đổi invariant #1 của `P1-SCOPE`**, phải qua change control cấp Master (`P1-SCOPE §8`), không được tự quyết ở cấp module con.

## 9. Ranh giới với module khác

- Invariant hiện hành không được mở rộng ngầm bởi module này: `P1-SCOPE`.
- Kiến trúc hiện tại làm nền tảng đánh giá điều kiện tách service: `P1-ARCH`.
- Schema hiện tại không được thêm cột "phòng trước" cho các mục ở đây: `P1-DATA`.

Module này chỉ ghi nhận **ranh giới và điều kiện cho tương lai** — không cấp phép triển khai bất kỳ nội dung nào trong Phase 1.
