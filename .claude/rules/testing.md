paths:

"**/*.test.ts"

"**/*.spec.ts"

"tests/**/*.ts"

"e2e/**/*.ts"

"playwright.config.ts"

"vitest.config.ts"

Test design rules

Derive tests from the issue acceptance gate and P1-QA; do not merely mirror implementation lines.

Use unit tests for pure rules, PostgreSQL integration tests for repositories/transactions, contract tests for API/provider boundaries, and E2E for cross-layer behavior.

Make concurrency tests coordinate overlapping operations rather than call the same function sequentially.

Prove idempotency by retrying the same request/event and checking durable state and side effects.

Provider adapters must cover success, timeout, 429, 5xx, malformed response, retry exhaustion, and fail-safe state.

Security tests must attempt direct unauthorized requests, cross-role access, ownership bypass, replay, payload abuse, and sensitive-field exposure.

Keep fixtures explicit and isolated. Reset state deterministically; do not depend on test order or wall-clock sleeps.

A test that cannot fail when the behavior is broken is not acceptable evidence.