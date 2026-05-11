<!--
  [id].vue - Chat conversation page
  Displays an active chat conversation with full messaging capabilities including:
  - Real-time streaming responses via the AI SDK (Vercel AI SDK)
  - Message editing, regeneration, and error handling
  - CSS-based message entrance animation (respects prefers-reduced-motion)
  - Nuxt UI chat prompt with model and personality selectors
  - Incremental message loading for long conversation histories
  - Auto-send first message for newly created chats
-->
<script setup lang="ts">
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import type { ChatUsage } from '~/utils/chatActivity'

/**
 * Shape of the chat page data returned by the API.
 * Includes metadata, messages, ownership info, project details, and document context.
 */
type ChatPageData = {
  id: string
  title: string | null
  visibility: 'public' | 'private'
  personality: string
  projectId: string | null
  project: {
    id: string
    name: string
  } | null
  documentId: number | null
  documentIds: number[]
  documents: ChatDocumentSummary[]
  recentProjectChats: Array<{
    id: string
    title: string | null
    createdAt: string | Date
    documentCount: number
  }>
  createdAt: string | Date
  messages: Array<UIMessage & { createdAt?: string | Date }>
  isOwner: boolean
}

/** Summary of a document attached as context to the chat */
type ChatDocumentSummary = {
  id: number
  title: string
}

const route = useRoute()
const toast = useToast()
/** Reactive model reference shared via the useModels composable */
const { model } = useModels()
/** CSRF token utilities for securing mutating API requests */
const { csrf, headerName } = useCsrf()

/** Reactive chat ID extracted from the current route params */
const chatId = computed(() => route.params.id as string)

/**
 * Fetch chat data from the API.
 * useFetch forwards cookies during SSR for private chats.
 * Key is dynamic so it re-fetches when navigating between chats.
 */
const {
  data,
  status,
  refresh: refreshChat
} = await useFetch<ChatPageData>(() => `/api/chats/${chatId.value}`, {
  key: () => `chat-${chatId.value}`
})

/** Whether the current user is the owner of this chat (controls edit/delete UI) */
const isOwner = computed(() => data.value?.isOwner ?? false)

/** Documents attached as chat-level reference context. */
const selectedDocIds = ref<number[]>([])
const selectedDocuments = ref<ChatDocumentSummary[]>([])
const syncingDocuments = ref(false)
const lastUsage = ref<ChatUsage | null>(null)

const chatDocuments = computed(() => selectedDocuments.value)
const project = computed(() => data.value?.project ?? null)
const recentProjectChats = computed(() => data.value?.recentProjectChats ?? [])

/** Human-readable label for the document context badge. */
const documentContextLabel = computed(() => {
  const documents = chatDocuments.value
  if (documents.length === 0) return 'No document context'
  if (documents.length === 1) return `Document: ${documents[0]!.title}`
  return `${documents.length} document contexts`
})

/** Reactive input field value for the message prompt */
const input = ref('')

/** AI Chat instance (shallowRef to avoid deep reactivity overhead on the SDK object) */
const chat = shallowRef<InstanceType<typeof Chat> | null>(null)

/**
 * Initializes a new Chat SDK instance with the fetched data.
 * Configures the transport layer, error handling, and auto-send
 * behavior for newly created chats (single message, owner-only).
 */
function initChat() {
  if (!data.value) return

  // Auto-send first AI response for newly created chats
  // Only on client-side, only if owner, and only when there's exactly 1 message
  const shouldAutoSend =
    import.meta.client && data.value.isOwner && data.value.messages.length === 1

  /**
   * The Chat instance from the AI SDK.
   * Configured with the chat ID, initial messages, and transport settings.
   */
  const instance = new Chat({
    id: data.value.id,
    messages: data.value.messages as unknown as UIMessage[],
    transport: new DefaultChatTransport({
      api: `/api/chats/${data.value.id}`,
      headers: { [headerName]: csrf },
      body: {
        get model() {
          return model.value
        },
        get documentIds() {
          return project.value ? selectedDocIds.value : undefined
        }
      }
    }),
    /** Listen for server-sent data parts (e.g., chat title updates) */
    onData: dataPart => {
      if (dataPart.type === 'data-chat-title') {
        refreshNuxtData('chats')
        refreshNuxtData('projects')
      }

      if (dataPart.type === 'data-chat-usage') {
        lastUsage.value = getChatUsage(dataPart.data)
      }
    },
    onFinish: () => {
      refreshNuxtData('projects')
    },
    /** Handle streaming and API errors by showing a persistent toast notification */
    onError(error) {
      toast.add({
        description: getChatErrorMessage(error),
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

function getChatErrorMessage(error: Error): string {
  const message = error.message || 'The selected AI provider returned an error.'
  const parsedMessage = getParsedErrorMessage(message)
  return parsedMessage || message
}

function getParsedErrorMessage(message: string): string | undefined {
  if (!message.trim().startsWith('{')) {
    return undefined
  }

  try {
    const payload = JSON.parse(message) as {
      message?: string
      statusMessage?: string
      data?: { message?: string; statusMessage?: string }
    }

    return (
      payload.data?.message ||
      payload.data?.statusMessage ||
      payload.message ||
      payload.statusMessage
    )
  } catch {
    return undefined
  }
}

// Re-initialize chat whenever fetched data changes (navigation between chats triggers new data)
watch(
  data,
  val => {
    if (val) initChat()
    else chat.value = null
  },
  { immediate: true }
)

watch(
  () => data.value?.id,
  () => {
    selectedDocIds.value = data.value?.documentIds ?? []
    selectedDocuments.value = data.value?.documents ?? []
    lastUsage.value = null
  },
  { immediate: true }
)

watch(
  selectedDocIds,
  ids => {
    selectedDocuments.value = ids.map(
      id =>
        selectedDocuments.value.find(document => document.id === id) ??
        data.value?.documents.find(document => document.id === id) ?? {
          id,
          title: `Document #${id}`
        }
    )
  },
  { deep: true }
)

/**
 * Latest message ID used to identify which message is actively streaming.
 * This drives reactivity for the streaming message's rendering.
 */
const latestMessageId = computed(
  () => chat.value?.messages[chat.value.messages.length - 1]?.id ?? null
)

/** Computed flag indicating whether the user can submit a new message */
const canSubmit = computed(() => input.value.trim().length > 0 && chat.value?.status === 'ready')

/**
 * Handles form submission: sends the user's message and clears the input.
 * Prevents submission when the input is empty or the chat is not ready.
 */
async function handleSubmit(e?: Event) {
  e?.preventDefault()
  const text = input.value.trim()
  if (!text || chat.value?.status !== 'ready') return

  await syncDocumentContext()
  lastUsage.value = null
  chat.value.sendMessage({ text })
  input.value = ''
}

async function syncDocumentContext() {
  if (!data.value || !isOwner.value) return
  if (arraysEqual(selectedDocIds.value, data.value.documentIds)) return

  syncingDocuments.value = true
  try {
    const documents = await $fetch<ChatDocumentSummary[]>(`/api/chats/${data.value.id}/documents`, {
      method: 'PATCH',
      headers: { [headerName]: csrf },
      body: { documentIds: selectedDocIds.value }
    })

    data.value.documentIds = documents.map(document => document.id)
    data.value.documents = documents
    selectedDocuments.value = documents
    await refreshChat()
  } catch (error) {
    const description =
      (error as { data?: { message?: string }; message?: string }).data?.message ||
      (error as { message?: string }).message ||
      'Failed to update document context.'

    toast.add({
      description,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
    throw error
  } finally {
    syncingDocuments.value = false
  }
}

function arraysEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function getChatUsage(data: unknown): ChatUsage | null {
  const usage = (data as { usage?: ChatUsage } | undefined)?.usage
  if (!usage) return null

  return usage
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
      class="relative min-h-0 flex-1"
      :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
    >
      <template #header>
        <Navbar>
          <ChatShareButton v-if="isOwner" :chat-id="data.id" />
        </Navbar>
      </template>

      <template #body>
        <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6 pb-4">
          <ChatTranscript
            v-if="chat"
            :messages="chat.messages"
            :status="chat.status"
            :latest-message-id="latestMessageId"
            :editing-message-id="isOwner ? editingMessageId : null"
            :show-actions="isOwner"
            :spacing-offset="isOwner ? 160 : 0"
            :reset-key="data.id"
            messages-class="pt-(--ui-header-height) pb-4 sm:pb-6"
            @edit="startEdit"
            @regenerate="regenerateMessage"
            @save="saveEdit"
            @cancel-edit="editingMessageId = null"
          />

          <ProjectsRecentChats v-if="project" :project="project" :chats="recentProjectChats" />

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
                <DocumentSelect
                  v-if="project"
                  v-model="selectedDocIds"
                  aria-label="Select project document contexts"
                  :disabled="syncingDocuments || chat.status !== 'ready'"
                  @selected-documents="selectedDocuments = $event"
                />
                <UBadge
                  v-if="chatDocuments.length > 0"
                  color="primary"
                  variant="subtle"
                  icon="i-lucide-files"
                  class="max-w-full"
                >
                  <span class="truncate">{{ documentContextLabel }}</span>
                </UBadge>
                <UBadge v-else color="neutral" variant="subtle" icon="i-lucide-file-x-2">
                  No document context
                </UBadge>
              </div>
            </template>
          </UChatPrompt>
        </UContainer>
      </template>
    </UDashboardPanel>

    <ChatActivityPanel
      v-if="data?.id && chat"
      class="hidden xl:flex"
      :status="chat.status"
      :messages="chat.messages"
      :model="model"
      :usage="lastUsage"
      :project="project"
      :documents="chatDocuments"
    />

    <!-- Error state: only when fetch genuinely failed or returned empty -->
    <UContainer
      v-else-if="status === 'error' || (status === 'success' && !data)"
      class="flex-1 flex flex-col gap-4 sm:gap-6"
    >
      <UError :error="{ statusMessage: 'Chat not found', statusCode: 404 }" class="min-h-full" />
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
