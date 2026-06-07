<!--
  [token].vue — Public read-only shared chat page

  Displays the current live transcript behind a share token. It uses the
  minimal share layout, omits sidebar/input/actions, and refreshes periodically
  so viewers can see future owner-side chat changes.
-->
<script setup lang="ts">
import type { PublicSharedChatResponse } from '~~/shared/types/chatShares'

definePageMeta({
  layout: 'share'
})

const route = useRoute()
const shareToken = computed(() => route.params.token as string)

const { data, status, refresh } = await useFetch<PublicSharedChatResponse>(
  () => `/api/shared-chats/${shareToken.value}`,
  {
    key: () => `shared-chat-${shareToken.value}`
  }
)

const messages = computed(() => data.value?.messages ?? [])
const latestMessageId = computed(() => messages.value[messages.value.length - 1]?.id ?? null)
const pageTitle = computed(() => data.value?.title || 'Shared chat')
const updatedLabel = computed(() => formatDateTime(data.value?.updatedAt))

useHead({
  title: () => `${pageTitle.value} · Shared chat`,
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'googlebot', content: 'noindex, nofollow' }
  ]
})

let refreshTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  refreshTimer = setInterval(() => {
    void refresh()
  }, 5000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

/** Formats an ISO timestamp for the shared-chat header using the browser locale. Returns empty string on falsy input. */
function formatDateTime(value: string | Date | undefined) {
  if (!value) return ''

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<template>
  <main class="min-h-dvh">
    <header class="sticky top-0 z-10 border-b border-default bg-default/80 backdrop-blur">
      <UContainer class="flex h-14 items-center justify-between gap-3">
        <NuxtLink
          to="/"
          class="flex min-w-0 items-center gap-2"
          aria-label="Paperless UI Chat home"
        >
          <Logo class="size-7 shrink-0" />
          <span class="truncate text-sm font-semibold text-highlighted">Paperless UI Chat</span>
        </NuxtLink>

        <div class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle" icon="i-lucide-radio"> Live read-only </UBadge>
          <UColorModeButton />
        </div>
      </UContainer>
    </header>

    <UContainer v-if="data" class="max-w-4xl py-6 sm:py-10">
      <section class="mb-6 rounded-3xl border border-default bg-elevated/40 p-5 sm:p-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Shared chat</p>
            <h1 class="truncate text-2xl font-semibold text-highlighted">
              {{ pageTitle }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              Read-only link. New messages from the owner appear automatically.
            </p>
          </div>

          <UBadge color="neutral" variant="soft" icon="i-lucide-clock" class="shrink-0">
            Updated {{ updatedLabel }}
          </UBadge>
        </div>
      </section>

      <ChatTranscript
        :messages="messages"
        status="ready"
        :latest-message-id="latestMessageId"
        :show-actions="false"
        :should-auto-scroll="false"
        :spacing-offset="24"
        :reset-key="shareToken"
        messages-class="pb-8"
      />
    </UContainer>

    <UContainer
      v-else-if="status === 'error' || (status === 'success' && !data)"
      class="flex min-h-[70dvh] items-center justify-center"
    >
      <UError
        :error="{ statusMessage: 'Shared chat not found', statusCode: 404 }"
        class="min-h-full"
      />
    </UContainer>
  </main>
</template>
