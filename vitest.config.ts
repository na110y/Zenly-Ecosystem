import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/**/*.{ts,vue}', 'server/**/*.ts'],
      // .vue page files are thin markup + composable wiring; $fetch inside a compiled SFC
      // is rewritten by the Nuxt build pipeline to a real import that cannot be stubbed
      // outside a full Nuxt runtime (mountSuspended fails on @vite-pwa/nuxt's virtual
      // module in this environment). The actual logic lives in app/composables/**, which
      // is unit-tested directly; page behavior is verified through real Playwright E2E.
      exclude: ['**/*.test.ts', '**/*.spec.ts', 'tests/**', 'app/pages/**/*.vue'],
    },
  },
})
