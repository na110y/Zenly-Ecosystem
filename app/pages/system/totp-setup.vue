<script setup lang="ts">
import { useAdminTotpSetup } from '../../composables/useAdminTotpSetup'

const {
  step,
  status,
  errorMessage,
  email,
  password,
  code,
  qrCodeDataUrl,
  submitLogin,
  submitActivate,
} = useAdminTotpSetup({
  login: async (body) => {
    await $fetch('/api/admin/login', { method: 'POST', body })
  },
  setup: async () => {
    return await $fetch<{ qrCodeDataUrl: string }>('/api/admin/totp/setup', { method: 'POST' })
  },
  activate: async (body) => {
    await $fetch('/api/admin/totp/activate', { method: 'POST', body })
  },
})
</script>

<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-4 text-xl font-semibold">Thiết lập TOTP</h1>

    <form v-if="step === 'login'" class="flex flex-col gap-3" @submit.prevent="submitLogin">
      <label class="flex flex-col gap-1">
        <span>Email</span>
        <input
          v-model="email"
          type="email"
          required
          class="border p-2"
          data-testid="admin-login-email"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span>Mật khẩu</span>
        <input
          v-model="password"
          type="password"
          required
          class="border p-2"
          data-testid="admin-login-password"
        />
      </label>

      <button
        type="submit"
        :disabled="status === 'loading'"
        class="border p-2"
        data-testid="admin-login-submit"
      >
        {{ status === 'loading' ? 'Đang xử lý...' : 'Tiếp tục' }}
      </button>

      <p v-if="status === 'error'" role="alert" data-testid="admin-login-error">
        {{ errorMessage }}
      </p>
    </form>

    <div v-else-if="step === 'activate'" class="flex flex-col gap-3">
      <p>Quét mã QR bằng ứng dụng xác thực, sau đó nhập mã 6 số.</p>
      <img :src="qrCodeDataUrl" alt="Mã QR thiết lập TOTP" data-testid="admin-totp-qr" />

      <form class="flex flex-col gap-3" @submit.prevent="submitActivate">
        <label class="flex flex-col gap-1">
          <span>Mã xác minh</span>
          <input
            v-model="code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            required
            class="border p-2"
            data-testid="admin-totp-code"
          />
        </label>

        <button
          type="submit"
          :disabled="status === 'loading'"
          class="border p-2"
          data-testid="admin-totp-activate-submit"
        >
          {{ status === 'loading' ? 'Đang xác minh...' : 'Kích hoạt' }}
        </button>

        <p v-if="status === 'error'" role="alert" data-testid="admin-totp-error">
          {{ errorMessage }}
        </p>
      </form>
    </div>

    <p v-else-if="step === 'done'" data-testid="admin-totp-success">
      Đã kích hoạt TOTP thành công.
    </p>
  </main>
</template>
