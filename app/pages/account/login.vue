<script setup lang="ts">
import { useLoginForm } from '../../composables/useLoginForm'

const { email, password, status, errorMessage, submit } = useLoginForm(async (body) => {
  await $fetch('/api/user/login', { method: 'POST', body })
})
</script>

<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-4 text-xl font-semibold">Đăng nhập</h1>

    <form v-if="status !== 'success'" class="flex flex-col gap-3" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span>Email</span>
        <input v-model="email" type="email" required class="border p-2" data-testid="login-email" />
      </label>
      <label class="flex flex-col gap-1">
        <span>Mật khẩu</span>
        <input
          v-model="password"
          type="password"
          required
          class="border p-2"
          data-testid="login-password"
        />
      </label>

      <button
        type="submit"
        :disabled="status === 'loading'"
        class="border p-2"
        data-testid="login-submit"
      >
        {{ status === 'loading' ? 'Đang đăng nhập...' : 'Đăng nhập' }}
      </button>

      <p v-if="status === 'error'" role="alert" data-testid="login-error">{{ errorMessage }}</p>
    </form>

    <p v-else data-testid="login-success">Đăng nhập thành công.</p>
  </main>
</template>
