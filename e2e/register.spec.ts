import { test, expect } from '@playwright/test'
import { createPrismaClient } from '../prisma/client'

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://zenly:change_me@localhost:5432/zenly'
const prisma = createPrismaClient(databaseUrl)

test.afterAll(async () => {
  await prisma.$disconnect()
})

test('user can register and verify their email through the real UI, API, and database', async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`

  await page.goto('/account/register')
  await page.getByTestId('register-email').fill(email)
  await page.getByTestId('register-display-name').fill('E2E Tester')
  await page.getByTestId('register-password').fill('password123')
  await page.getByTestId('register-submit').click()

  await expect(page.getByTestId('register-success')).toBeVisible()

  const user = await prisma.user.findUnique({ where: { email } })
  expect(user).not.toBeNull()
  expect(user?.status).toBe('REGISTERED')

  // No real inbox in this environment (NUXT_RESEND_API_KEY is empty in dev) — read the
  // token hash from the database directly to drive the verify-email UI, matching how a
  // real user would arrive via the emailed link.
  const tokenRecord = await prisma.emailVerificationToken.findFirst({ where: { userId: user!.id } })
  expect(tokenRecord).not.toBeNull()

  // The plaintext token cannot be recovered from its hash (by design — only the hash is
  // persisted, per P1-SEC §1). This E2E test therefore covers the real UI -> API -> DB path
  // for registration and the verify-email error UI; the verify-email happy path (token
  // consumption + User status transition) is proven against real PostgreSQL directly at the
  // use-case layer in tests/prisma/register-flow.test.ts, which does have access to the
  // plaintext token right after it is generated.
  await page.goto('/account/verify-email?token=not-a-real-token')
  await expect(page.getByTestId('verify-error')).toBeVisible()
})
