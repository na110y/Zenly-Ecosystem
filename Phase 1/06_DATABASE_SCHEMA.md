# P1-DATA — Database Schema

**Phase:** 1 · **Version:** 2.2 · **Owns:** Schema PostgreSQL, constraint, index, counter, session, feed, notification, analytics, audit và runtime settings.
**Depends on:** [P1-ARCH](02_ARCHITECTURE_CODEBASE.md), [P1-FLOW](05_BUSINESS_FLOWS.md)

[← P1-FLOW](05_BUSINESS_FLOWS.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Đây là schema PostgreSQL/Prisma **đầy đủ** cho Phase 1, viết một lần để mọi issue tạo bảng (`P1-I004`, `P1-I010`, `P1-I015`, `P1-I030`, `P1-I033`, `P1-I040`, v.v.) triển khai đúng cùng một thiết kế thay vì phát sinh dần và mâu thuẫn nhau. Mỗi issue implement một tập con bảng theo đúng tên/cột dưới đây — **không đổi tên, không thêm bảng ngoài danh sách này** mà không quay lại sửa module này trước.
>
> Mọi state/enum tham chiếu trực tiếp từ `P1-FLOW`. Mọi entity phải có `id` (UUID), `createdAt`, `updatedAt` trừ khi ghi chú khác.

## 1. Quy ước chung

- **Kiểu ID:** `UUID` (`gen_random_uuid()` hoặc tương đương, dùng extension `pgcrypto`/`uuid-ossp` nếu cần — quyết định cụ thể trong migration đầu tiên).
- **Timestamp:** `TIMESTAMPTZ`, luôn UTC.
- **Soft-delete:** dùng cột `deletedAt TIMESTAMPTZ NULL` cho entity cần giữ audit trail (comment, reply); không hard-delete các entity này trong luồng bình thường.
- **Optimistic concurrency:** entity có thể bị sửa đồng thời bởi nhiều admin (Settings, FeatureFlag) có cột `version INTEGER NOT NULL DEFAULT 1`, tăng mỗi lần update, kiểm tra ở tầng repository.
- **Money/số nhạy cảm:** không có trong Phase 1 (không payment).
- Không lưu secret/token dạng plaintext (password, TOTP secret, session token, reset token) — luôn hash/encrypt (chi tiết thuật toán thuộc `P1-SEC`).

## 2. Identity — User & Session (P1-I010, P1-I011–014)

```
User
  id                UUID PK
  email             TEXT UNIQUE NOT NULL
  passwordHash      TEXT NOT NULL
  displayName       TEXT NOT NULL
  status            ENUM(REGISTERED, EMAIL_VERIFIED, ACTIVE, SUSPENDED) NOT NULL DEFAULT REGISTERED
  emailVerifiedAt   TIMESTAMPTZ NULL
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt         TIMESTAMPTZ NOT NULL

EmailVerificationToken
  id            UUID PK
  userId        UUID FK -> User.id ON DELETE CASCADE
  tokenHash     TEXT UNIQUE NOT NULL
  expiresAt     TIMESTAMPTZ NOT NULL
  consumedAt    TIMESTAMPTZ NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (userId)

PasswordResetToken
  id            UUID PK
  userId        UUID FK -> User.id ON DELETE CASCADE
  tokenHash     TEXT UNIQUE NOT NULL
  expiresAt     TIMESTAMPTZ NOT NULL
  consumedAt    TIMESTAMPTZ NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (userId)

UserSession
  id            UUID PK
  userId        UUID FK -> User.id ON DELETE CASCADE
  tokenHash     TEXT UNIQUE NOT NULL
  userAgent     TEXT NULL
  ipHash        TEXT NULL
  expiresAt     TIMESTAMPTZ NOT NULL
  revokedAt     TIMESTAMPTZ NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (userId), INDEX (expiresAt)

UserNotificationPreference
  id                    UUID PK
  userId                UUID FK -> User.id ON DELETE CASCADE UNIQUE
  newStoriesEmail       BOOLEAN NOT NULL DEFAULT false
  newChaptersEmail      BOOLEAN NOT NULL DEFAULT false
  webPushEnabled        BOOLEAN NOT NULL DEFAULT false
  updatedAt             TIMESTAMPTZ NOT NULL
```

Namespace session **tách biệt** với `AdminSession` (mục 3) — không FK chéo, không bảng dùng chung.

## 3. Identity — Admin, RBAC, TOTP (P1-I015–020)

```
AdminAccount
  id                UUID PK
  email             TEXT UNIQUE NOT NULL
  passwordHash      TEXT NOT NULL
  role              ENUM(ADMIN, SUPER_ADMIN) NOT NULL
  status            ENUM(ACTIVE, DISABLED) NOT NULL DEFAULT ACTIVE
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt         TIMESTAMPTZ NOT NULL

AdminTotpCredential
  id                UUID PK
  adminAccountId    UUID FK -> AdminAccount.id ON DELETE CASCADE UNIQUE
  secretEncrypted   TEXT NOT NULL
  activatedAt       TIMESTAMPTZ NULL
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()

AdminTotpRecoveryCode
  id                UUID PK
  adminAccountId    UUID FK -> AdminAccount.id ON DELETE CASCADE
  codeHash          TEXT NOT NULL
  usedAt            TIMESTAMPTZ NULL
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (adminAccountId)

AdminSession
  id                UUID PK
  adminAccountId    UUID FK -> AdminAccount.id ON DELETE CASCADE
  tokenHash         TEXT UNIQUE NOT NULL
  totpVerifiedAt    TIMESTAMPTZ NULL   -- NULL = challenge chưa hoàn tất, session chưa hợp lệ cho admin API
  expiresAt         TIMESTAMPTZ NOT NULL
  revokedAt         TIMESTAMPTZ NULL
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (adminAccountId), INDEX (expiresAt)

AdminAuditLog
  id                UUID PK
  adminAccountId    UUID FK -> AdminAccount.id ON DELETE SET NULL
  action            TEXT NOT NULL          -- vd: 'FEATURE_FLAG_UPDATE', 'ADMIN_ROLE_CHANGE'
  targetType        TEXT NOT NULL
  targetId          TEXT NULL
  beforeValue       JSONB NULL
  afterValue        JSONB NULL
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (targetType, targetId), INDEX (createdAt)
```

Constraint nghiệp vụ "luôn còn ít nhất một SUPER_ADMIN active" (`P1-FLOW`/`P1-ADMIN §3`) enforce ở application layer trong transaction trước khi hạ quyền/xóa/disable — không thể biểu diễn thuần bằng CHECK constraint SQL vì cần đếm toàn bảng.

## 4. System settings & feature flags (P1-I020)

```
FeatureFlag
  id                UUID PK
  key               TEXT UNIQUE NOT NULL   -- 'user_posting_enabled' | 'user_reporting_enabled' | 'community_feature_enabled' | 'auto_send_notification_enabled'
  enabled           BOOLEAN NOT NULL DEFAULT false
  scope             ENUM(SUPER_ADMIN_ONLY, ADMIN_MANAGEABLE) NOT NULL
  version           INTEGER NOT NULL DEFAULT 1
  updatedByAdminId  UUID FK -> AdminAccount.id ON DELETE SET NULL
  updatedAt         TIMESTAMPTZ NOT NULL

SystemSetting
  id                UUID PK
  key               TEXT UNIQUE NOT NULL
  value             JSONB NOT NULL
  version           INTEGER NOT NULL DEFAULT 1
  updatedByAdminId  UUID FK -> AdminAccount.id ON DELETE SET NULL
  updatedAt         TIMESTAMPTZ NOT NULL
```

Seed bắt buộc: 4 flag ở mục "key" đều seed sẵn với `enabled = false` (khớp default-off theo `P1-SCOPE §3.2`, `§3.5`).

## 5. Stories & Chapters (P1-I030, P1-I032, P1-I033)

```
Story
  id            UUID PK
  slug          TEXT UNIQUE NOT NULL
  title         TEXT NOT NULL
  description   TEXT NULL
  coverImageUrl TEXT NULL
  status        ENUM(DRAFT, PUBLISHED, ARCHIVED) NOT NULL DEFAULT DRAFT
  publishedAt   TIMESTAMPTZ NULL
  createdByAdminId UUID FK -> AdminAccount.id ON DELETE SET NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt     TIMESTAMPTZ NOT NULL
  INDEX (status), INDEX (slug)

Chapter
  id            UUID PK
  storyId       UUID FK -> Story.id ON DELETE CASCADE
  slug          TEXT NOT NULL
  title         TEXT NOT NULL
  orderIndex    INTEGER NOT NULL
  contentPath   TEXT NOT NULL     -- private storage path, TXT — không public trực tiếp
  youtubeUrl    TEXT NULL
  status        ENUM(DRAFT, PUBLISHED, ARCHIVED) NOT NULL DEFAULT DRAFT
  publishedAt   TIMESTAMPTZ NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt     TIMESTAMPTZ NOT NULL
  UNIQUE (storyId, slug)
  UNIQUE (storyId, orderIndex)
  INDEX (storyId, status)

StoryImportJob
  id              UUID PK
  storyId         UUID FK -> Story.id ON DELETE CASCADE
  status          ENUM(QUEUED, PROCESSING, SUCCEEDED, FAILED, CANCELLED) NOT NULL DEFAULT QUEUED
  totalFiles      INTEGER NOT NULL
  processedFiles  INTEGER NOT NULL DEFAULT 0
  lastError       TEXT NULL
  createdByAdminId UUID FK -> AdminAccount.id ON DELETE SET NULL
  createdAt       TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt       TIMESTAMPTZ NOT NULL

StoryImportJobItem
  id            UUID PK
  jobId         UUID FK -> StoryImportJob.id ON DELETE CASCADE
  fileName      TEXT NOT NULL
  status        ENUM(PENDING, SUCCEEDED, FAILED) NOT NULL DEFAULT PENDING
  chapterId     UUID FK -> Chapter.id ON DELETE SET NULL NULL
  errorMessage  TEXT NULL
  UNIQUE (jobId, fileName)   -- idempotency: reprocess không tạo item trùng
```

## 6. Public counters (P1-I039)

```
StoryCounter
  storyId       UUID PK FK -> Story.id ON DELETE CASCADE
  viewCount     BIGINT NOT NULL DEFAULT 0
  likeCount     BIGINT NOT NULL DEFAULT 0
  commentCount  BIGINT NOT NULL DEFAULT 0
  updatedAt     TIMESTAMPTZ NOT NULL
```

Counter cập nhật bằng `UPDATE ... SET x = x + 1` trong transaction cùng sự kiện gốc (like/comment) để tránh race condition — không tính lại bằng COUNT(*) trên mỗi request.

## 7. Community feed (P1-I040–050)

```
FeedPost
  id            UUID PK
  authorType    ENUM(OFFICIAL, USER) NOT NULL
  authorAdminId UUID FK -> AdminAccount.id ON DELETE SET NULL NULL   -- khi authorType = OFFICIAL
  authorUserId  UUID FK -> User.id ON DELETE SET NULL NULL           -- khi authorType = USER
  content       TEXT NOT NULL
  status        ENUM(PENDING, VISIBLE, REJECTED) NOT NULL DEFAULT PENDING
  moderatedAt   TIMESTAMPTZ NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt     TIMESTAMPTZ NOT NULL
  deletedAt     TIMESTAMPTZ NULL
  INDEX (status, createdAt)   -- cursor pagination

FeedPostCounter
  postId        UUID PK FK -> FeedPost.id ON DELETE CASCADE
  likeCount     BIGINT NOT NULL DEFAULT 0
  commentCount  BIGINT NOT NULL DEFAULT 0
  updatedAt     TIMESTAMPTZ NOT NULL

VisitorIdentity
  id            UUID PK
  tokenHash     TEXT UNIQUE NOT NULL
  mergedIntoUserId UUID FK -> User.id ON DELETE SET NULL NULL   -- set khi guest đăng ký/đăng nhập, dùng để merge
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()

Like
  id            UUID PK
  targetType    ENUM(STORY, FEED_POST) NOT NULL
  targetId      UUID NOT NULL
  userId        UUID FK -> User.id ON DELETE CASCADE NULL
  visitorId     UUID FK -> VisitorIdentity.id ON DELETE CASCADE NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (targetType, targetId, userId)     -- một user chỉ like 1 lần / target
  UNIQUE (targetType, targetId, visitorId)  -- một visitor chỉ like 1 lần / target
  CHECK ((userId IS NOT NULL) OR (visitorId IS NOT NULL))

Comment
  id            UUID PK
  targetType    ENUM(STORY_CHAPTER, FEED_POST) NOT NULL
  targetId      UUID NOT NULL
  parentId      UUID FK -> Comment.id ON DELETE CASCADE NULL   -- reply khi có parentId
  userId        UUID FK -> User.id ON DELETE SET NULL NULL
  visitorId     UUID FK -> VisitorIdentity.id ON DELETE SET NULL NULL
  content       TEXT NOT NULL
  status        ENUM(PENDING, VISIBLE, REJECTED) NOT NULL DEFAULT PENDING
  moderatedAt   TIMESTAMPTZ NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt     TIMESTAMPTZ NOT NULL
  deletedAt     TIMESTAMPTZ NULL
  CHECK ((userId IS NOT NULL) OR (visitorId IS NOT NULL))
  INDEX (targetType, targetId, status), INDEX (parentId)
```

Cửa sổ sửa/xóa 15 phút (`P1-FLOW §3`) tính từ `Comment.createdAt` ở application layer mỗi request — không cần cột riêng, nhưng repository phải so sánh `now() - createdAt <= interval '15 minutes'` trong cùng câu lệnh UPDATE (WHERE clause) để tránh race giữa kiểm tra và ghi.

## 8. Story request (P1-I061)

```
StoryRequest
  id            UUID PK
  userId        UUID FK -> User.id ON DELETE SET NULL NULL
  visitorId     UUID FK -> VisitorIdentity.id ON DELETE SET NULL NULL
  contactEmail  TEXT NOT NULL
  title         TEXT NOT NULL
  note          TEXT NULL
  status        ENUM(NEW, IN_PROGRESS, DONE, DECLINED) NOT NULL DEFAULT NEW
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt     TIMESTAMPTZ NOT NULL
  CHECK ((userId IS NOT NULL) OR (visitorId IS NOT NULL))
```

## 9. Contact capture & consent (P1-I060)

```
ConsentLedgerEntry
  id            UUID PK
  contactEmail  TEXT NOT NULL
  purpose       TEXT NOT NULL      -- 'STORY_REQUEST' | 'SUBSCRIPTION' | ...
  sourceRef     TEXT NULL          -- id bản ghi gốc (StoryRequest.id, Subscription.id, ...)
  consentedAt   TIMESTAMPTZ NOT NULL DEFAULT now()
  revokedAt     TIMESTAMPTZ NULL
  INDEX (contactEmail)
```

## 10. Subscriptions & notifications (P1-I062–068)

```
EmailSubscription
  id            UUID PK
  email         TEXT NOT NULL
  userId        UUID FK -> User.id ON DELETE SET NULL NULL
  status        ENUM(UNVERIFIED, VERIFIED, ACTIVE, UNSUBSCRIBED) NOT NULL DEFAULT UNVERIFIED
  verifyTokenHash    TEXT NULL
  unsubscribeTokenHash TEXT NOT NULL
  topics        TEXT[] NOT NULL DEFAULT '{}'   -- 'NEW_STORIES' | 'STORY_CHAPTERS'
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt     TIMESTAMPTZ NOT NULL
  UNIQUE (email)

WebPushSubscription
  id            UUID PK
  userId        UUID FK -> User.id ON DELETE CASCADE NULL
  endpoint      TEXT UNIQUE NOT NULL
  p256dhKey     TEXT NOT NULL
  authKey       TEXT NOT NULL
  status        ENUM(ACTIVE, EXPIRED) NOT NULL DEFAULT ACTIVE
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()

InSiteNotification
  id            UUID PK
  userId        UUID FK -> User.id ON DELETE CASCADE
  type          TEXT NOT NULL      -- 'NEW_CHAPTER' | 'REQUEST_UPDATE' | 'ACCOUNT_SECURITY' | ...
  payload       JSONB NOT NULL
  readAt        TIMESTAMPTZ NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (userId, readAt)

PublicationEvent
  id            UUID PK
  storyId       UUID FK -> Story.id ON DELETE CASCADE
  chapterId     UUID FK -> Chapter.id ON DELETE CASCADE NULL
  eventType     ENUM(STORY_PUBLISHED, CHAPTER_PUBLISHED) NOT NULL
  occurredAt    TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (storyId, chapterId, eventType)   -- không tạo event trùng cho cùng transition

NotificationOutbox
  id                UUID PK
  publicationEventId UUID FK -> PublicationEvent.id ON DELETE CASCADE
  channel           ENUM(EMAIL, WEB_PUSH, IN_SITE) NOT NULL
  subscriberRef     TEXT NOT NULL     -- email hoặc userId hoặc pushSubscriptionId, tùy channel
  status            ENUM(PENDING, SENT, FAILED, DEFERRED, SKIPPED) NOT NULL DEFAULT PENDING
  attemptCount      INTEGER NOT NULL DEFAULT 0
  lastError         TEXT NULL
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt         TIMESTAMPTZ NOT NULL
  UNIQUE (publicationEventId, channel, subscriberRef)   -- idempotent fan-out
  INDEX (status)
```

`NotificationOutbox` là bảng outbox PostgreSQL-backed theo `P1-ARCH §5` — worker polling đọc `status = PENDING`, cập nhật atomic bằng `UPDATE ... WHERE status = 'PENDING' RETURNING *` (skip-locked pattern) để tránh double-send khi có nhiều worker.

## 11. Moderation (P1-I047, P1-I048)

```
ModerationDecision
  id            UUID PK
  targetType    ENUM(COMMENT, FEED_POST) NOT NULL
  targetId      UUID NOT NULL
  source        ENUM(AUTOMATED, ADMIN) NOT NULL
  result        ENUM(APPROVE, REJECT, PENDING) NOT NULL
  providerName  TEXT NULL          -- tên automated provider, NULL nếu source = ADMIN
  providerRaw   JSONB NULL         -- kết quả thô CHỈ lưu nội bộ, không bao giờ trả qua API public
  adminAccountId UUID FK -> AdminAccount.id ON DELETE SET NULL NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (targetType, targetId, createdAt)
```

## 12. Abuse guard (P1-I049, P1-I050)

```
AbuseSignal
  id            UUID PK
  subjectType   ENUM(VISITOR, USER, IP_HASH) NOT NULL
  subjectRef    TEXT NOT NULL
  signalType    TEXT NOT NULL      -- 'RATE_SPIKE' | 'SPAM_PATTERN' | ...
  riskScore     INTEGER NOT NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (subjectType, subjectRef, createdAt)

AbuseBlock
  id                UUID PK
  subjectType       ENUM(VISITOR, USER, IP_HASH) NOT NULL
  subjectRef        TEXT NOT NULL
  reason            TEXT NOT NULL
  blockedByAdminId  UUID FK -> AdminAccount.id ON DELETE SET NULL
  createdAt         TIMESTAMPTZ NOT NULL DEFAULT now()
  clearedAt         TIMESTAMPTZ NULL
  UNIQUE (subjectType, subjectRef, clearedAt)   -- chỉ 1 block đang hiệu lực / subject (NULLS distinct cho phép nhiều bản ghi đã clear)
```

## 13. Tracking & analytics (P1-I070–075)

```
TrackingLink
  id            UUID PK
  slug          TEXT UNIQUE NOT NULL
  destinationUrl TEXT NOT NULL
  createdByAdminId UUID FK -> AdminAccount.id ON DELETE SET NULL
  createdAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  updatedAt     TIMESTAMPTZ NOT NULL

AnalyticsSession
  id            UUID PK
  visitorId     UUID FK -> VisitorIdentity.id ON DELETE SET NULL NULL
  trackingLinkId UUID FK -> TrackingLink.id ON DELETE SET NULL NULL
  isBot         BOOLEAN NOT NULL DEFAULT false
  startedAt     TIMESTAMPTZ NOT NULL DEFAULT now()
  lastSeenAt    TIMESTAMPTZ NOT NULL

AnalyticsEvent
  id            UUID PK
  sessionId     UUID FK -> AnalyticsSession.id ON DELETE CASCADE
  eventType     TEXT NOT NULL      -- 'PAGE_VIEW' | 'STORY_VIEW' | 'CHAPTER_READ' | ...
  targetRef     TEXT NULL
  occurredAt    TIMESTAMPTZ NOT NULL DEFAULT now()
  INDEX (eventType, occurredAt)

AnalyticsDailyAggregate
  id            UUID PK
  day           DATE NOT NULL
  metric        TEXT NOT NULL
  dimension     TEXT NULL          -- vd storyId, trackingLinkId dạng text để gộp nhiều loại
  value         BIGINT NOT NULL
  UNIQUE (day, metric, dimension)
```

Loại trừ bot khỏi `AnalyticsSession`/`AnalyticsEvent` thực hiện ở tầng ghi (application layer khi phát hiện user-agent/pattern đã biết là bot) trước khi insert — không tính lại sau bằng filter tại query time cho aggregate.

## 14. Extensions cần thiết

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
```

## 15. Chỉ số hiệu năng bắt buộc (index summary)

Mọi bảng cursor-paginate công khai (`FeedPost`, `Comment`, `AnalyticsEvent`) phải có index hỗ trợ `(status, createdAt)` hoặc tương đương để tránh full scan khi tải trang tiếp theo — chi tiết ngân sách truy vấn cụ thể thuộc `P1-PERF`.

## 16. Ranh giới với module khác

- Ý nghĩa nghiệp vụ của từng state/enum: `P1-FLOW` (sở hữu), bảng này chỉ hiện thực hóa.
- Request/response field mapping ra API: `P1-API`.
- Mã hóa cụ thể (thuật toán hash, key rotation), TTL token: `P1-SEC`.
- Ngân sách RAM/kích thước dữ liệu trên VPS 2 GB: `P1-INFRA`.

Không tạo bảng, cột, hoặc enum ngoài danh sách này khi triển khai issue liên quan tới schema. Nếu một issue cần trường dữ liệu chưa có ở đây, dừng lại và báo `SPEC_CONFLICT` thay vì tự thêm.
