<script setup lang="ts">
import { useProfileForm, type ProfileData } from '../../composables/useProfileForm'

const { displayName, email, status, load, submit } = useProfileForm({
  async get(): Promise<ProfileData> {
    const response: unknown = await $fetch('/api/user/profile')
    return response as ProfileData
  },
  async update(body) {
    await $fetch('/api/user/profile', { method: 'PATCH', body })
  },
})

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-4 text-xl font-semibold">Hồ sơ</h1>

    <form class="flex flex-col gap-3" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span>Email</span>
        <input
          :value="email"
          type="email"
          disabled
          class="border p-2"
          data-testid="profile-email"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span>Tên hiển thị</span>
        <input
          v-model="displayName"
          type="text"
          required
          class="border p-2"
          data-testid="profile-display-name"
        />
      </label>

      <button
        type="submit"
        :disabled="status === 'loading'"
        class="border p-2"
        data-testid="profile-submit"
      >
        {{ status === 'loading' ? 'Đang lưu...' : 'Lưu thay đổi' }}
      </button>

      <p v-if="status === 'success'" data-testid="profile-success">Đã cập nhật hồ sơ.</p>
      <p v-if="status === 'error'" role="alert" data-testid="profile-error">
        Đã có lỗi xảy ra. Vui lòng thử lại.
      </p>
    </form>
  </main>
</template>
