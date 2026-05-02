<!--
  index.vue - Home / new chat page
  Landing page with a greeting, message input form, and quick action cards.
  Handles new chat creation via API and navigates the user to the new chat.
-->
<script setup lang="ts">
const input = ref('')
const loading = ref(false)
const selectedDocId = ref<number | null>(null)
const textarea = ref<HTMLTextAreaElement | null>(null)
const toast = useToast()
const { csrf, headerName } = useCsrf()
const { personality } = usePersonality()

/** Dynamic greeting based on the current time of day */
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
const greeting = ref('Hello')

onMounted(() => {
  greeting.value = getGreeting()
  resizeTextarea()
})

/** Keeps the prompt textarea compact for short prompts and grows for longer text. */
function resizeTextarea() {
  const element = textarea.value
  if (!element) return

  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 220)}px`
}

watch(input, () => {
  nextTick(resizeTextarea)
})

/** Predefined quick action prompts for common use cases */
const quickChats = [
  {
    label: 'Summarize a document',
    icon: 'i-lucide-file-text'
  },
  {
    label: 'Draft an email',
    icon: 'i-lucide-mail'
  },
  {
    label: 'Explain a concept',
    icon: 'i-lucide-lightbulb'
  },
  {
    label: 'Create an action plan',
    icon: 'i-lucide-list-checks'
  }
]

/** Computed flag indicating whether the user can submit a message */
const canSubmit = computed(() => input.value.trim().length > 0 && !loading.value)

/**
 * Creates a new chat via the API and navigates to it.
 * Generates a UUID for both the chat and the first message,
 * sends the initial user message, and handles errors gracefully.
 */
async function createChat(prompt: string) {
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt || loading.value) return

  loading.value = true

  try {
    const chatId = crypto.randomUUID()
    await $fetch('/api/chats', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: {
        id: chatId,
        message: {
          id: crypto.randomUUID(),
          role: 'user',
          parts: [{ type: 'text', text: trimmedPrompt }]
        },
        personality: personality.value,
        ...(selectedDocId.value ? { documentId: selectedDocId.value } : {})
      }
    })

    input.value = ''
    await nextTick()
    resizeTextarea()
    refreshNuxtData('chats')

    await navigateTo(`/chat/${chatId}`)
  } catch (error) {
    // Extract a user-friendly error message from the response
    const description =
      (error as { data?: { message?: string }; message?: string }).data?.message ||
      (error as { message?: string }).message ||
      'Failed to create chat.'

    toast.add({
      description,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

/** Handles the form submission event */
async function onSubmit(event?: Event) {
  event?.preventDefault()
  await createChat(input.value)
}
</script>

<template>
  <UDashboardPanel id="home" class="min-h-0" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <div class="relative flex-1 flex flex-col justify-center">
        <!-- Subtle background gradient blobs for visual depth -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            class="absolute -top-40 -right-40 size-80 rounded-full bg-linear-to-br from-primary/5 to-transparent blur-3xl"
          />
          <div
            class="absolute -bottom-40 -left-40 size-80 rounded-full bg-linear-to-tr from-violet-500/5 to-transparent blur-3xl"
          />
        </div>

        <UContainer class="relative flex flex-col justify-center gap-6 sm:gap-8 py-12">
          <!-- Dynamic greeting heading with gradient text -->
          <div class="space-y-2">
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span
                class="bg-linear-to-r from-neutral-900 via-neutral-800 to-neutral-700 dark:from-neutral-100 dark:via-neutral-200 dark:to-neutral-300 bg-clip-text text-transparent"
              >
                <ClientOnly>
                  {{ greeting }}
                  <template #fallback>Hello</template>
                </ClientOnly>
              </span>
            </h1>
            <p class="text-lg text-muted max-w-md">How can I help you today?</p>
          </div>

          <!-- Message input form with glassmorphism styling -->
          <form
            class="[view-transition-name:chat-prompt] relative flex flex-col items-stretch gap-3 px-4 py-3.5 w-full rounded-2xl backdrop-blur-xl bg-neutral-200/60 dark:bg-neutral-800/60 ring-1 ring-default/50 shadow-xl"
            @submit.prevent="onSubmit"
          >
            <!-- Textarea for entering the initial message -->
            <textarea
              ref="textarea"
              v-model="input"
              placeholder="Type your message here..."
              rows="2"
              aria-label="Initial chat message"
              :disabled="loading"
              class="max-h-55 min-h-16 w-full resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-base text-highlighted placeholder:text-dimmed outline-none disabled:cursor-not-allowed disabled:opacity-75"
              @input="resizeTextarea"
              @keydown.enter.exact.prevent="onSubmit"
            />

            <!-- Bottom toolbar: model/personality selectors and send button -->
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                <ModelSelect aria-label="Select AI model" />
                <PersonalitySelect aria-label="Select AI personality" />
                <DocumentSelect v-model="selectedDocId" aria-label="Select document context" />
                <UBadge
                  v-if="selectedDocId"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-file-check-2"
                  class="max-w-full"
                >
                  <span class="truncate">Document #{{ selectedDocId }} selected</span>
                </UBadge>
              </div>

              <!-- Submit button with loading state -->
              <UButton
                type="submit"
                color="primary"
                size="sm"
                square
                :icon="loading ? 'i-lucide-loader-2' : 'i-lucide-send'"
                aria-label="Send prompt"
                :loading="loading"
                :disabled="!canSubmit"
                class="self-end shadow-lg shadow-primary/25 sm:self-auto"
              />
            </div>
          </form>

          <!-- Quick action cards grid -->
          <div class="quick-actions grid grid-cols-2 gap-2">
            <button
              v-for="(quickChat, index) in quickChats"
              :key="quickChat.label"
              class="quick-action group"
              :style="{ animationDelay: `${index * 60}ms` }"
              :disabled="loading"
              @click="createChat(quickChat.label)"
            >
              <span :class="[quickChat.icon, 'quick-action-icon']" aria-hidden="true" />
              <span class="quick-action-label">{{ quickChat.label }}</span>
            </button>
          </div>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
/* Staggered entrance animations respecting reduced motion preference */
@media (prefers-reduced-motion: no-preference) {
  h1 {
    animation: fadeSlideUp 0.6s ease-out both;
  }

  p {
    animation: fadeSlideUp 0.6s ease-out 0.1s both;
  }

  form {
    animation: fadeSlideUp 0.6s ease-out 0.2s both;
  }

  .quick-actions {
    animation: fadeSlideUp 0.5s ease-out 0.3s both;
  }

  .quick-action {
    animation: fadeSlideUp 0.4s ease-out both;
  }
}

/* Quick action card styles — Codex-inspired design */
.quick-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
}

/* Hover state for quick action cards */
.quick-action:hover:not(:disabled) {
  border-color: var(--ui-border-hover);
  background: var(--ui-bg);
  color: var(--ui-text-highlighted);
}

/* Active press effect */
.quick-action:active:not(:disabled) {
  transform: scale(0.98);
}

/* Disabled state */
.quick-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Icon styling within quick action cards */
.quick-action-icon {
  flex-shrink: 0;
  font-size: 0.875rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.quick-action:hover .quick-action-icon {
  opacity: 0.8;
}

/* Text overflow handling for labels */
.quick-action-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Keyframe animation for staggered fade-slide-up entrance */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
