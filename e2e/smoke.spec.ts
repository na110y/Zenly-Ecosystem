import { test, expect } from '@playwright/test'

test('server boots and serves the home page', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/Nuxt/)
})
