<!--
  [id].vue - Chat conversation page
  Displays an active chat conversation with full messaging capabilities including:
  - Real-time streaming responses via AI SDK
  - Message editing, regeneration, and error handling
  - CSS-based message entrance animation
  - Nuxt UI chat prompt with model and personality selectors
-->
<script setup lang="ts">
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'

type ChatPageData = {
  id: string
  title: string | null
  visibility: 'public' | 'private'
  personality: string
  documentId: number | null
  createdAt: string | Date
  messages: Array<UIMessage & { createdAt?: string | Date }>
  isOwner: boolean
}

const route = useRoute()
const toast = useToast()
const { model } = useModels()
const { csrf, headerName } = useCsrf()

/** Reactive chat ID from route params */
const chatId = computed(() => route.params.id as string)

/** Fetch chat data from the API — useFetch forwards cookies during SSR for private chats */
const { data, status } = await useFetch<ChatPageData>(() => `/api/chats/${chatId.value}`, {
  key: () => `chat-${chatId.value}`
})

/** Whether the current user is the owner of this chat */
const isOwner = computed(() => data.value?.isOwner ?? false)

/** Reactive input field value for the message prompt */
const input = ref('')
const visibleMessageCount = ref(80)

/** AI Chat instance, re-created when navigating between chats */
const chat = shallowRef<InstanceType<typeof Chat> | null>(null)

function initChat() {
  if (!data.value) return
  visibleMessageCount.value = 80

  const shouldAutoSend
    = import.meta.client
      && data.value.isOwner
      && data.value.messages.length === 1

  const instance = new Chat({
    id: data.value.id,
    messages: data.value.messages as unknown as UIMessage[],
    transport: new DefaultChatTransport({
      api: `/api/chats/${data.value.id}`,
      headers: { [headerName]: csrf },
      body: {
        get model() {
          return model.value
        }
      }
    }),
    onData: (dataPart) => {
      if (dataPart.type === 'data-chat-title') {
        refreshNuxtData('chats')
      }
    },
    onError(error) {
      let message = error.message
      if (typeof message === 'string' && message[0] === '{') {
        try {
          message = JSON.parse(message).message || message
        } catch {
          // keep original message on malformed JSON
        }
      }

      toast.add({
        description: message,
        icon: 'i-lucide-alert-circle',
        color: 'error',
        duration: 0
      })
    }
  })

  chat.value = instance

  // Auto-send first AI response for newly created chats
  if (shouldAutoSend) {
    nextTick(() => instance.sendMessage())
  }
}

// Re-initialize chat whenever fetched data changes (new route = new data)
watch(
  data,
  (val) => {
    if (val) initChat()
    else chat.value = null
  },
  { immediate: true }
)

/** Latest message id is used to keep streaming message rendering reactive. */
const latestMessageId = computed(
  () => chat.value?.messages[chat.value.messages.length - 1]?.id ?? null
)

/** Only render the most recent messages by default for very long conversations. */
const visibleMessages = computed(() => {
  const messages = chat.value?.messages ?? []
  const start = Math.max(0, messages.length - visibleMessageCount.value)
  return messages.slice(start)
})

/** Number of messages hidden above the current viewport window. */
const hiddenMessageCount = computed(() =>
  Math.max(0, (chat.value?.messages.length ?? 0) - visibleMessageCount.value)
)

/** Reveals older messages in batches without forcing all history to render at once. */
function showOlderMessages() {
  visibleMessageCount.value += 40
}

/** Small memo key for Vue render skipping on stable, non-streaming messages. */
function getMessageMemoKey(message: UIMessage) {
  if (message.id !== latestMessageId.value) {
    return `${message.parts.length}:${message.role}`
  }

  return message.parts
    .map((part) => {
      if ('text' in part && typeof part.text === 'string') {
        return `${part.type}:${part.text.length}:${part.text.slice(-16)}`
      }
      if ('state' in part && typeof part.state === 'string') {
        return `${part.type}:${part.state}`
      }
      return part.type
    })
    .join('|')
}

/** Computed flag indicating whether the user can submit a new message */
const canSubmit = computed(
  () => input.value.trim().length > 0 && chat.value?.status === 'ready'
)

/**
 * Handles form submission: sends the user's message and clears the input.
 * Prevents submission when the input is empty or the chat is not ready.
 */
async function handleSubmit(e?: Event) {
  e?.preventDefault()
  const text = input.value.trim()
  if (!text || chat.value?.status !== 'ready') return

  chat.value.sendMessage({ text })
  input.value = ''
}

/** Tracks which message is currently being edited (null = none) */
const editingMessageId = ref<string | null>(null)

/**
 * Starts editing a user message.
 * Prevents opening multiple edit forms simultaneously.
 */
function startEdit(message: UIMessage) {
  if (editingMessageId.value) return

  editingMessageId.value = message.id
}

/**
 * Saves an edited message:
 * 1. Deletes the original message and subsequent messages from the server
 * 2. Sends the edited text as a new message to regenerate the response
 */
async function saveEdit(message: UIMessage, text: string) {
  try {
    await $fetch(`/api/chats/${data.value!.id}/messages`, {
      method: 'DELETE',
      headers: { [headerName]: csrf },
      body: { messageId: message.id, type: 'edit' }
    })
  } catch {
    toast.add({
      description: 'Failed to save edit.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
    return
  }

  editingMessageId.value = null
  chat.value!.sendMessage({ text, messageId: message.id })
}

/**
 * Regenerates an assistant message:
 * 1. Deletes the original assistant response from the server
 * 2. Requests a new response from the AI
 */
async function regenerateMessage(message: UIMessage) {
  try {
    await $fetch(`/api/chats/${data.value!.id}/messages`, {
      method: 'DELETE',
      headers: { [headerName]: csrf },
      body: { messageId: message.id, type: 'regenerate' }
    })
  } catch {
    toast.add({
      description: 'Failed to regenerate.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
    return
  }

  chat.value!.regenerate({ messageId: message.id })
}
</script>

<template>
  <div class="flex-1 flex min-h-0">
    <!-- Chat panel: rendered when data exists (SSR + client) -->
    <UDashboardPanel
      v-if="data?.id"
      id="chat"
      class="relative min-h-0"
      :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
    >
      <template #header>
        <Navbar />
      </template>

      <template #body>
        <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6 pb-4">
          <!-- Chat messages list with auto-scrolling -->
          <UChatMessages
            v-if="chat"
            should-auto-scroll
            :messages="visibleMessages"
            :status="chat.status"
            :spacing-offset="isOwner ? 160 : 0"
            class="pt-(--ui-header-height) pb-4 sm:pb-6"
          >
            <template v-if="hiddenMessageCount > 0" #leading>
              <div class="flex justify-center py-2">
                <UButton
                  color="neutral"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-history"
                  :label="`Show ${Math.min(40, hiddenMessageCount)} older messages`"
                  @click="showOlderMessages"
                />
              </div>
            </template>

            <!-- Custom streaming indicator with animated dots -->
            <template #indicator>
              <div class="flex items-center gap-2">
                <ClientOnly>
                  <ChatIndicator />
                </ClientOnly>
                <UChatShimmer text="Thinking..." class="text-sm" />
              </div>
            </template>

            <!-- Message content with lightweight CSS animation -->
            <template #content="{ message }">
              <div
                v-memo="[
                  message.id,
                  getMessageMemoKey(message),
                  isOwner && editingMessageId === message.id
                ]"
                class="chat-message-enter"
              >
                <ChatMessageContent
                  :message="message"
                  :editing="isOwner && editingMessageId === message.id"
                  @save="saveEdit"
                  @cancel-edit="editingMessageId = null"
                />
              </div>
            </template>

            <!-- Message action buttons (copy, edit, regenerate) -->
            <template v-if="isOwner" #actions="{ message }">
              <ChatMessageActions
                :message="message"
                :streaming="
                  chat?.status === 'streaming'
                    && message.id === chat?.messages[chat.messages.length - 1]?.id
                "
                :editing="editingMessageId === message.id"
                @edit="startEdit"
                @regenerate="regenerateMessage"
              />
            </template>
          </UChatMessages>

          <!-- Chat input prompt (only visible to the chat owner) -->
          <UChatPrompt
            v-if="isOwner && chat"
            v-model="input"
            :error="chat.error"
            placeholder="Type your message here..."
            variant="subtle"
            class="sticky bottom-0 [view-transition-name:chat-prompt] z-10 w-full rounded-2xl backdrop-blur-xl bg-neutral-200/60 dark:bg-neutral-800/60 ring-1 ring-default/50 shadow-xl"
            @submit="handleSubmit"
          >
            <UChatPromptSubmit
              :status="chat.status"
              color="primary"
              icon="i-lucide-send"
              submitted-icon="i-lucide-square"
              streaming-icon="i-lucide-square"
              error-icon="i-lucide-rotate-cw"
              :disabled="chat.status === 'ready' && !canSubmit"
              class="shadow-lg shadow-primary/25"
              @stop="chat.stop()"
              @reload="chat.regenerate()"
            />

            <!-- Bottom toolbar: model/personality selectors and action buttons -->
            <template #footer>
              <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                <ModelSelect aria-label="Select AI model" />
                <PersonalitySelect aria-label="Select AI personality" />
                <UBadge
                  v-if="data?.documentId"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-file-check-2"
                >
                  Document context #{{ data.documentId }}
                </UBadge>
                <UBadge
                  v-else
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-file-x-2"
                >
                  No document context
                </UBadge>
              </div>
            </template>
          </UChatPrompt>
        </UContainer>
      </template>
    </UDashboardPanel>

    <!-- Error state: only when fetch genuinely failed or returned empty -->
    <UContainer
      v-else-if="status === 'error' || (status === 'success' && !data)"
      class="flex-1 flex flex-col gap-4 sm:gap-6"
    >
      <UError
        :error="{ statusMessage: 'Chat not found', statusCode: 404 }"
        class="min-h-full"
      />
    </UContainer>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .chat-message-enter {
    animation: chatMessageEnter 0.28s ease-out both;
  }
}

@keyframes chatMessageEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
