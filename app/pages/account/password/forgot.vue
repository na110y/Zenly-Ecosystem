<script setup lang="ts">
import { useForgotPasswordForm } from '../../../composables/useForgotPasswordForm'

const { email, status, submit } = useForgotPasswordForm(async (body) => {
  await $fetch('/api/user/password/forgot', { method: 'POST', body })
})
</script>

<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-4 text-xl font-semibold">Quên mật khẩu</h1>

    <form v-if="status !== 'success'" class="flex flex-col gap-3" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span>Email</span>
        <input
          v-model="email"
          type="email"
          required
          class="border p-2"
          data-testid="forgot-email"
        />
      </label>

      <button
        type="submit"
        :disabled="status === 'loading'"
        class="border p-2"
        data-testid="forgot-submit"
      >
        {{ status === 'loading' ? 'Đang gửi...' : 'Gửi liên kết đặt lại' }}
      </button>

      <p v-if="status === 'error'" role="alert" data-testid="forgot-error">
        Đã có lỗi xảy ra. Vui lòng thử lại.
      </p>
    </form>

    <p v-else data-testid="forgot-success">
      Nếu email tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi.
    </p>
  </main>
</template>
