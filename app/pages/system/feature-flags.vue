<script setup lang="ts">
import { onMounted } from 'vue'
import { useFeatureFlags, type FeatureFlagItem } from '../../composables/useFeatureFlags'

const { status, flags, errorMessage, toggleErrorKey, load, toggle } = useFeatureFlags({
  fetchFlags: async () => {
    return await $fetch<FeatureFlagItem[]>('/api/system/feature-flags')
  },
  updateFlag: async (key, body) => {
    return await $fetch<FeatureFlagItem>(`/api/system/feature-flags/${key}`, {
      method: 'PATCH',
      body,
    })
  },
})

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-2xl p-6">
    <h1 class="mb-4 text-xl font-semibold">Feature flags</h1>

    <p v-if="status === 'loading'" data-testid="flags-loading">Đang tải...</p>

    <p v-else-if="status === 'empty'" data-testid="flags-empty">Chưa có feature flag nào.</p>

    <p v-else-if="status === 'error'" role="alert" data-testid="flags-error">
      {{ errorMessage }}
    </p>

    <ul v-else-if="status === 'success'" class="flex flex-col gap-3" data-testid="flags-list">
      <li
        v-for="flag in flags"
        :key="flag.key"
        class="flex items-center justify-between border p-3"
        :data-testid="`flag-row-${flag.key}`"
      >
        <div>
          <p class="font-medium">{{ flag.key }}</p>
          <p class="text-sm text-gray-500">{{ flag.scope }}</p>
        </div>
        <button
          type="button"
          class="border p-2"
          :data-testid="`flag-toggle-${flag.key}`"
          @click="toggle(flag)"
        >
          {{ flag.enabled ? 'Tắt' : 'Bật' }}
        </button>
      </li>
      <p v-if="toggleErrorKey" role="alert" data-testid="flag-toggle-error">
        Không thể cập nhật "{{ toggleErrorKey }}" — có thể bạn không đủ quyền hoặc dữ liệu đã thay
        đổi. Danh sách đã được tải lại.
      </p>
    </ul>
  </main>
</template>
