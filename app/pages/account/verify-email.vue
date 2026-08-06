<script setup lang="ts">
import { useVerifyEmail } from '../../composables/useVerifyEmail'

const route = useRoute()
const { status, verify } = useVerifyEmail(async (body) => {
  await $fetch('/api/user/register/verify-email', { method: 'POST', body })
})

onMounted(() => {
  const token = route.query.token
  verify(typeof token === 'string' ? token : undefined)
})
</script>

<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-4 text-xl font-semibold">Xác minh email</h1>

    <p v-if="status === 'loading'" data-testid="verify-loading">Đang xác minh...</p>
    <p v-else-if="status === 'success'" data-testid="verify-success">
      Email đã được xác minh thành công. Bạn có thể đăng nhập.
    </p>
    <p v-else role="alert" data-testid="verify-error">
      Liên kết xác minh không hợp lệ hoặc đã hết hạn.
    </p>
  </main>
</template>
