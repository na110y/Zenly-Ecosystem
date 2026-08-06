<script setup lang="ts">
import { useRegisterForm } from '../../composables/useRegisterForm'

const { email, password, displayName, status, errorMessage, submit } = useRegisterForm(
  async (body) => {
    await $fetch('/api/user/register', { method: 'POST', body })
  },
)
</script>

<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-4 text-xl font-semibold">Đăng ký tài khoản</h1>

    <form v-if="status !== 'success'" class="flex flex-col gap-3" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span>Email</span>
        <input
          v-model="email"
          type="email"
          required
          class="border p-2"
          data-testid="register-email"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span>Tên hiển thị</span>
        <input
          v-model="displayName"
          type="text"
          required
          class="border p-2"
          data-testid="register-display-name"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span>Mật khẩu</span>
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          class="border p-2"
          data-testid="register-password"
        />
      </label>

      <button
        type="submit"
        :disabled="status === 'loading'"
        class="border p-2"
        data-testid="register-submit"
      >
        {{ status === 'loading' ? 'Đang gửi...' : 'Đăng ký' }}
      </button>

      <p v-if="status === 'error'" role="alert" data-testid="register-error">{{ errorMessage }}</p>
    </form>

    <p v-else data-testid="register-success">
      Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.
    </p>
  </main>
</template>
