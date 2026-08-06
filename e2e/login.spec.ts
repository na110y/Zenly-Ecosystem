import { test, expect } from '@playwright/test'
import { createPrismaClient } from '../prisma/client'
import { hashPassword } from '../server/identity/password'

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://zenly:change_me@localhost:5432/zenly'
const prisma = createPrismaClient(databaseUrl)

test.afterAll(async () => {
  await prisma.$disconnect()
})

test('user can log in through the real UI/API/DB and access a session-protected route, then log out', async ({
  page,
}) => {
  const email = `e2e-login-${Date.now()}@example.com`
  const passwordHash = await hashPassword('password123')
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName: 'E2E Login Tester' },
  })

  await page.goto('/account/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill('password123')
  await page.getByTestId('login-submit').click()

  await expect(page.getByTestId('login-success')).toBeVisible()

  const sessions = await prisma.userSession.findMany({ where: { userId: user.id } })
  expect(sessions).toHaveLength(1)
  expect(sessions[0].revokedAt).toBeNull()

  const meResponse = await page.request.get('/api/user/me')
  expect(meResponse.status()).toBe(200)
  expect(await meResponse.json()).toEqual({ userId: user.id })

  await page.request.post('/api/user/logout')

  const revokedSession = await prisma.userSession.findUnique({ where: { id: sessions[0].id } })
  expect(revokedSession?.revokedAt).not.toBeNull()
})

test('an unauthenticated request to a session-protected route returns 401', async ({ request }) => {
  const response = await request.get('/api/user/me')
  expect(response.status()).toBe(401)
})
