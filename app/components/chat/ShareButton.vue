<!--
  ShareButton.vue — Owner-only chat share controls

  Creates, copies, rotates, and revokes a live read-only share link for the
  current chat. The public URL is intentionally token-based and separate from
  the internal chat route.

  @prop chatId - The UUID of the chat to manage sharing for (owner-only operations)

  @section Share Lifecycle
    createShare  — POST /api/chats/:id/share, stores token + returns URL
    copyShareLink — writes activeShare.url to clipboard
    rotateShare  — PATCH /api/chats/:id/share, revokes old token, generates new one
    revokeShare  — DELETE /api/chats/:id/share, marks token inactive
    loadShare    — GET /api/chats/:id/share, fetches current share state into `share` ref

  @section UX
  The modal shows loading skeletons while fetching share state. Rotating
  automatically copies the new URL. Revoking shows a success toast and
  clears the share URL from the UI.
-->
<script setup lang="ts">
import type { ChatSharePayload, ChatShareResponse } from '~~/shared/types/chatShares'

const props = defineProps<{
  chatId: string
}>()

const toast = useToast()
const { csrf, headerName } = useCsrf()

const open = ref(false)
const share = ref<ChatShareResponse | null>(null)
const loading = ref(false)
const action = ref<'create' | 'copy' | 'rotate' | 'revoke' | null>(null)

const activeShare = computed(() => (share.value?.isActive ? share.value : null))

watch(open, isOpen => {
  if (isOpen) {
    void loadShare()
  }
})

/** Fetches the current share state for the chat so the modal renders active/empty correctly. */
async function loadShare() {
  loading.value = true
  try {
    const response = await $fetch<ChatSharePayload>(`/api/chats/${props.chatId}/share`)
    share.value = response.share
  } catch {
    toast.add({
      description: 'Failed to load share link status.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

/** Creates a new share link for the current chat and copies the resulting URL to the clipboard. */
async function createShare() {
  const nextShare = await mutateShare('POST', 'create')
  if (nextShare?.isActive) {
    await copyShareLink(nextShare.url)
  }
}

/** Rotates the share token, invalidating the previous one, and copies the fresh URL to the clipboard. */
async function rotateShare() {
  const nextShare = await mutateShare('PATCH', 'rotate')
  if (nextShare?.isActive) {
    await copyShareLink(nextShare.url)
  }
}

/** Revokes the active share link so it stops resolving, then shows a confirmation toast. */
async function revokeShare() {
  await mutateShare('DELETE', 'revoke')
  toast.add({
    description: 'Share link revoked.',
    icon: 'i-lucide-link-2-off',
    color: 'success'
  })
}

/**
 * Shared helper for create/rotate/revoke share-link operations.
 * Updates the local `share` ref, surfaces errors via toast, and tracks the current action
 * so the corresponding button can show its loading state.
 */
async function mutateShare(
  method: 'POST' | 'PATCH' | 'DELETE',
  nextAction: 'create' | 'rotate' | 'revoke'
) {
  action.value = nextAction
  try {
    const response = await $fetch<ChatSharePayload>(`/api/chats/${props.chatId}/share`, {
      method,
      headers: { [headerName]: csrf }
    })
    share.value = response.share
    return response.share
  } catch {
    toast.add({
      description: 'Failed to update share link.',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
    return null
  } finally {
    action.value = null
  }
}

/** Copies the provided share URL (defaulting to the active share) to the clipboard with toast feedback. */
async function copyShareLink(url = activeShare.value?.url) {
  if (!url) return

  action.value = 'copy'
  try {
    await navigator.clipboard.writeText(url)
    toast.add({
      description: 'Share link copied.',
      icon: 'i-lucide-copy-check',
      color: 'success'
    })
  } catch {
    toast.add({
      description: 'Copy failed. Select the link and copy it manually.',
      icon: 'i-lucide-alert-circle',
      color: 'warning'
    })
  } finally {
    action.value = null
  }
}

/** Selects the share URL input's full contents on focus for easy manual copy. */
function selectShareInput(event: FocusEvent) {
  if (event.target instanceof HTMLInputElement) {
    event.target.select()
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Share chat"
    description="Create a live read-only link. Anyone with the link can view future messages in this chat."
    :ui="{ content: 'sm:max-w-xl', footer: 'justify-between' }"
  >
    <UButton color="neutral" variant="ghost" icon="i-lucide-share-2" aria-label="Share chat" />

    <template #body>
      <div class="space-y-4">
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-shield-alert"
          title="Public to anyone with the link"
          description="The shared page is read-only and hidden from search indexing, but the URL can still be forwarded."
        />

        <div v-if="loading" class="rounded-xl border border-default bg-muted/20 p-4">
          <USkeleton class="h-4 w-2/3" />
          <USkeleton class="mt-3 h-10 w-full" />
        </div>

        <div v-else-if="activeShare" class="space-y-2">
          <UFormField
            label="Share URL"
            description="This URL stays live until you revoke or rotate it."
          >
            <UInput
              :model-value="activeShare.url"
              readonly
              icon="i-lucide-link"
              class="w-full"
              @focus="selectShareInput"
            />
          </UFormField>
        </div>

        <UAlert
          v-else
          color="neutral"
          variant="soft"
          icon="i-lucide-link"
          title="Not shared"
          description="Create a link when you are ready to share this chat in read-only mode."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="activeShare"
          label="Copy link"
          icon="i-lucide-copy"
          :loading="action === 'copy'"
          @click="copyShareLink()"
        />
        <UButton
          v-else
          label="Create link"
          icon="i-lucide-link"
          :loading="action === 'create'"
          @click="createShare"
        />
      </div>

      <div v-if="activeShare" class="flex flex-wrap justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Rotate"
          icon="i-lucide-refresh-cw"
          :loading="action === 'rotate'"
          @click="rotateShare"
        />
        <UButton
          color="error"
          variant="ghost"
          label="Revoke"
          icon="i-lucide-link-2-off"
          :loading="action === 'revoke'"
          @click="revokeShare"
        />
      </div>
    </template>
  </UModal>
</template>
