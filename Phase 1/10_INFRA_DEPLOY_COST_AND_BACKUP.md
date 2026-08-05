# P1-INFRA — Infra, Deploy, Cost & Backup

**Phase:** 1 · **Version:** 2.2 · **Owns:** VPS 2 GB launch, Docker services, resource budget, backup 0đ, monitoring, deploy và chi phí.
**Depends on:** [P1-ARCH](02_ARCHITECTURE_CODEBASE.md), [P1-DATA](06_DATABASE_SCHEMA.md), [P1-SEC](08_SECURITY_MODERATION_AND_PRIVACY.md), [P1-PERF](09_SEO_PERFORMANCE_CACHE_AND_PWA.md)

[← P1-PERF](09_SEO_PERFORMANCE_CACHE_AND_PWA.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Ràng buộc cứng: toàn bộ hạ tầng launch chạy trên **một VPS 2 GB RAM** (`P1-SCOPE §3.1`). Không Redis, không service thứ hai, không queue server riêng.

## 1. Docker services (production)

Dựa trên `docker-compose.yml` hiện có tại repo root (local dev) và mở rộng cho production tại `P1-I090`:

| Service | Vai trò | Ghi chú |
|---|---|---|
| `app` | Nuxt/Nitro application (Node runtime), phục vụ SSR + toàn bộ API | Một process duy nhất, restart `unless-stopped` |
| `db` | PostgreSQL 17 | Volume named (`zenly-pgdata`) để dữ liệu sống sót qua container recreate |
| `caddy` | Reverse proxy + TLS tự động (production, thêm tại `P1-I090`) | Không có trong compose local hiện tại — production-only |

`db-test` (Postgres cổng 5433) chỉ dùng **local/CI**, không chạy trên VPS production.

## 2. Biến môi trường bắt buộc

Theo `docker-compose.yml` hiện tại, các biến sau là bắt buộc và không được có giá trị mặc định kiểu `change_me`/`dev_*` khi lên production:

```
DATABASE_URL
NUXT_SESSION_SECRET          -- tối thiểu 32 byte
NUXT_DATA_ENCRYPTION_KEY     -- tối thiểu 32 byte, dùng cho mã hóa dữ liệu nhạy cảm (TOTP secret theo P1-SEC §1)
NUXT_VISITOR_HMAC_KEY        -- dùng để hash visitor token (P1-DATA §7)
NUXT_TOTP_ENCRYPTION_KEY     -- key mã hóa AdminTotpCredential.secretEncrypted
```

- Validate toàn bộ biến môi trường lúc khởi động (`P1-I002`): thiếu hoặc giá trị dev placeholder trên production phải chặn khởi động, không chạy với giá trị không an toàn.
- Không commit giá trị thật vào `.env`; dùng `.env.example` với placeholder (khớp `.claude/rules` cấp Master: "Never edit .env or print secret values").

## 3. Ngân sách tài nguyên trên VPS 2 GB

- Tổng RAM khả dụng cho toàn bộ container ≤ 2 GB, phải chừa dự phòng cho OS/Docker daemon (khuyến nghị không cấp phát vượt quá ~1.5 GB cho `app` + `db` cộng lại, còn lại là buffer).
- PostgreSQL: cấu hình `shared_buffers`, `work_mem`, `max_connections` phù hợp máy nhỏ (giá trị cụ thể xác định tại `P1-I091` dựa trên load test thật, không đoán trước ở đây).
- Node/Nitro: giới hạn heap phù hợp (`--max-old-space-size`) để tránh OOM kill khi traffic tăng đột biến.
- Background worker (outbox polling — `P1-ARCH §5`) chạy trong cùng process `app`, không spawn thêm container riêng.
- Resource guard (`P1-I091`): giám sát và cảnh báo khi RAM/CPU vượt ngưỡng an toàn, không tự động scale (không có hạ tầng để scale ngang trong Phase 1).

## 4. Backup — phương án 0đ

- **Nguồn cần backup:** PostgreSQL (toàn bộ dữ liệu nghiệp vụ), file TXT chương (`Chapter.contentPath` trong `storage/`), ảnh bìa đã upload.
- **Đích lưu trữ:** ngoài VPS, dùng dịch vụ lưu trữ 0đ (free tier) — ví dụ object storage free tier hoặc Git-based storage cho snapshot định kỳ; lựa chọn cụ thể xác định tại `P1-I093`, không bắt buộc dịch vụ trả phí.
- **Tần suất:** backup định kỳ tự động (job chạy trong `app` hoặc cron hệ thống ngoài Docker), đủ để giới hạn mất dữ liệu trong khoảng chấp nhận được cho một sản phẩm launch giai đoạn đầu.
- **Restore:** phải có runbook diễn tập được — phục hồi từ backup ra một môi trường sạch và xác minh dữ liệu đọc được, không chỉ giả định file backup hợp lệ.
- Snapshot trả phí (VPS provider snapshot) **chưa bắt buộc** ở Phase 1 (`P1-SCOPE §3.8`) — có thể dùng nếu miễn phí trong gói hiện tại, nhưng không phải điều kiện go-live.

## 5. Health, readiness & rollback (P1-I092)

- `app` expose health endpoint (liveness) và readiness endpoint (kiểm tra kết nối DB thành công) — dùng cho Docker healthcheck và giám sát ngoài.
- Migration chạy như bước riêng biệt trước khi `app` nhận traffic mới (không migrate ngầm trong request đầu tiên).
- Deploy có khả năng rollback: giữ image version trước đó có thể khởi động lại nhanh nếu migration/deploy mới lỗi; migration bản thân phải forward-safe theo `.claude/rules/database.md` (không rewrite migration đã apply, có kế hoạch rollback/compensation cho thay đổi phá hủy).

## 6. Observability tối thiểu (P1-I094)

- Uptime check bên ngoài (free tier) ping endpoint public định kỳ, cảnh báo khi downtime.
- Log tập trung ở mức tối thiểu: log ứng dụng có `requestId` (khớp `P1-API §2`), đủ để trace lỗi mà không cần thêm hạ tầng log riêng (không ELK/Loki bắt buộc — nằm ngoài ngân sách 2 GB).
- Cảnh báo tối thiểu: downtime, lỗi 5xx tăng bất thường, dung lượng đĩa gần đầy, quota email/push gần hết (liên hệ `P1-FLOW §7` cost guard).

## 7. TLS & Caddy (P1-I090)

- Caddy đảm nhiệm TLS tự động (Let's Encrypt hoặc tương đương free), reverse proxy vào `app`.
- Header bảo mật (CSP, CORS liên quan tại tầng edge nếu áp dụng) không được mâu thuẫn với header ứng dụng đã định nghĩa tại `P1-SEC §2` — Caddy chỉ terminate TLS và forward, không tự ý ghi đè CSP của ứng dụng trừ khi được cấu hình nhất quán.

## 8. Chi phí — ràng buộc chung

- Không dịch vụ nào trong danh sách trên được phép auto-upgrade sang gói trả phí hoặc auto-renew ngoài ý muốn (`P1-SCOPE §3.7`, `§3.8`).
- Bất kỳ thành phần hạ tầng mới nào được đề xuất thêm ngoài `app`/`db`/`caddy` phải đánh giá lại ngân sách 2 GB và được xác nhận không vi phạm invariant #1 trước khi thêm.

## 9. Ranh giới với module khác

- Kiến trúc modular monolith và stack: `P1-ARCH`.
- Schema và dữ liệu cần backup: `P1-DATA`.
- Ngưỡng bảo mật env/secret: `P1-SEC`.
- Ngân sách hiệu năng ứng dụng cần đạt trên hạ tầng này: `P1-PERF`.
- Trình tự triển khai các issue hạ tầng: `P1-ROADMAP`.

Module này sở hữu **cấu hình hạ tầng, ngân sách tài nguyên, backup và deploy** — không định nghĩa lại kiến trúc ứng dụng hay schema.
