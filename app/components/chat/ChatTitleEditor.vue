<!--
  ChatTitleEditor.vue - Inline chat title rename control for the chat navbar.
  Keeps rename close to the visible title, with keyboard-friendly save/cancel.
-->
<script setup lang="ts">
const MAX_CHAT_TITLE_LENGTH = 80

const props = defineProps<{
  chatId: string
  title: string | null
  editable?: boolean
}>()

const emit = defineEmits<{
  renamed: [title: string]
}>()

const toast = useToast()
const { csrf, headerName } = useCsrf()

const isEditing = ref(false)
const isSaving = ref(false)
const draftTitle = ref('')

const currentTitle = computed(() => props.title?.trim().replace(/\s+/g, ' ') || '')
const displayTitle = computed(() => currentTitle.value || 'Untitled chat')
const normalizedDraftTitle = computed(() => draftTitle.value.trim().replace(/\s+/g, ' '))
const canSave = computed(
  () =>
    normalizedDraftTitle.value.length > 0 &&
    normalizedDraftTitle.value.length <= MAX_CHAT_TITLE_LENGTH &&
    normalizedDraftTitle.value !== currentTitle.value &&
    !isSaving.value
)

/** Enters rename mode and seeds the draft input with the current normalized title. */
function startRename() {
  if (!props.editable) return

  draftTitle.value = currentTitle.value
  isEditing.value = true
}

function cancelRename() {
  draftTitle.value = ''
  isEditing.value = false
}

/** Extracts a user-safe error message from an H3/$fetch error, falling back to a generic string. */
function getRequestErrorMessage(error: unknown) {
  const payload = error as { data?: { message?: string; statusMessage?: string }; message?: string }
  return (
    payload.data?.message ||
    payload.data?.statusMessage ||
    payload.message ||
    'Failed to rename chat.'
  )
}

/** PATCHes the chat with the normalized draft title, emits `renamed`, and shows a success/error toast. */
async function saveRename() {
  if (!canSave.value) return

  isSaving.value = true
  try {
    const result = await $fetch<{ id: string; title: string }>(`/api/chats/${props.chatId}`, {
      method: 'PATCH',
      headers: { [headerName]: csrf },
      body: {
        title: normalizedDraftTitle.value
      }
    })

    emit('renamed', result.title)
    isEditing.value = false

    toast.add({
      title: 'Chat renamed',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      description: getRequestErrorMessage(error),
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <form
    v-if="editable && isEditing"
    class="flex w-[min(58vw,30rem)] max-w-full min-w-0 items-center gap-1"
    @submit.prevent="saveRename"
  >
    <UInput
      v-model="draftTitle"
      autofocus
      autocomplete="off"
      :maxlength="MAX_CHAT_TITLE_LENGTH"
      :disabled="isSaving"
      aria-label="Chat title"
      size="sm"
      class="min-w-0 flex-1"
      @keydown.esc.prevent="cancelRename"
    />
    <UButton
      type="submit"
      icon="i-lucide-check"
      size="xs"
      color="primary"
      variant="ghost"
      :loading="isSaving"
      :disabled="!canSave"
      aria-label="Save chat title"
    />
    <UButton
      type="button"
      icon="i-lucide-x"
      size="xs"
      color="neutral"
      variant="ghost"
      :disabled="isSaving"
      aria-label="Cancel chat title rename"
      @click="cancelRename"
    />
  </form>

  <div
    v-else
    class="group flex w-[min(58vw,30rem)] max-w-full min-w-0 items-center justify-start gap-1"
  >
    <span class="truncate text-sm font-medium text-highlighted sm:text-base" :title="displayTitle">
      {{ displayTitle }}
    </span>
    <UButton
      v-if="editable"
      type="button"
      icon="i-lucide-pencil"
      size="xs"
      color="neutral"
      variant="ghost"
      class="opacity-70 transition-opacity group-hover:opacity-100"
      aria-label="Rename chat"
      @click="startRename"
    />
  </div>
</template>
