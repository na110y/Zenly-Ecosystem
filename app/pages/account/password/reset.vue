<script setup lang="ts">
import { useResetPasswordForm } from '../../../composables/useResetPasswordForm'

const route = useRoute()
const { newPassword, status, errorMessage, submit } = useResetPasswordForm(async (body) => {
  await $fetch('/api/user/password/reset', { method: 'POST', body })
})

function onSubmit() {
  const token = route.query.token
  submit(typeof token === 'string' ? token : undefined)
}
</script>

<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-4 text-xl font-semibold">Đặt lại mật khẩu</h1>

    <form v-if="status !== 'success'" class="flex flex-col gap-3" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1">
        <span>Mật khẩu mới</span>
        <input
          v-model="newPassword"
          type="password"
          required
          minlength="8"
          class="border p-2"
          data-testid="reset-new-password"
        />
      </label>

      <button
        type="submit"
        :disabled="status === 'loading'"
        class="border p-2"
        data-testid="reset-submit"
      >
        {{ status === 'loading' ? 'Đang xử lý...' : 'Đặt lại mật khẩu' }}
      </button>

      <p v-if="status === 'error'" role="alert" data-testid="reset-error">{{ errorMessage }}</p>
    </form>

    <p v-else data-testid="reset-success">
      Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại.
    </p>
  </main>
</template>
