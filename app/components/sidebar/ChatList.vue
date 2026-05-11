<!--
  ChatList.vue - Grouped sidebar chat navigation
  Displays chats organized by date groups (Today, Yesterday, Last 7 days, etc.)
  with color-coded avatar initials, document count badges, and delete actions.
  Supports incremental loading of older chats via the "Show more" button.
  Deletion and data fetching are owned by the parent layout component.
-->
<script setup lang="ts">
import type { UIChatGroup } from '~/composables/useChats'

/**
 * Component props
 * @property {UIChatGroup[]} groups - Date-grouped chat items to render
 * @property {string | undefined} activeChatId - Currently active chat ID for highlight styling
 * @property {boolean} hasChats - Whether any chats exist (controls empty state)
 * @property {number} hiddenChatCount - Number of chats not yet visible (controls "Show more")
 * @property {number} loadIncrement - How many chats to load per "Show more" click
 * @property {string} emptyTitle - Title shown in the empty state
 * @property {string} emptyDescription - Description shown in the empty state
 * @property {boolean} showDelete - Whether to show per-chat delete buttons
 */
const props = withDefaults(
  defineProps<{
    groups: UIChatGroup[]
    activeChatId?: string
    hasChats: boolean
    hiddenChatCount: number
    loadIncrement: number
    emptyTitle?: string
    emptyDescription?: string
    showDelete?: boolean
  }>(),
  {
    activeChatId: undefined,
    emptyTitle: 'No chats yet',
    emptyDescription: 'Start a new conversation and it will appear here.',
    showDelete: true
  }
)

/**
 * Component events
 * @event delete - Requests deletion of a chat by ID
 * @event showMore - Requests loading additional older chats
 * @event select - Fired when a chat link is clicked (used to close mobile sidebar)
 */
const emit = defineEmits<{
  delete: [id: string]
  showMore: []
  select: []
}>()

/**
 * Generates a deterministic Tailwind background color class from a string.
 * Uses a simple hash to pick from a palette of 12 colors.
 * @param str - Input string (typically a chat ID)
 * @returns Tailwind bg-{color}-500 class string
 */
function stringToColor(str: string): string {
  const colors = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-fuchsia-500',
    'bg-lime-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-teal-500'
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]!
}

/**
 * Extracts up to two uppercase initials from a chat title.
 * Returns '?' for untitled chats.
 * @param title - Chat title string
 * @returns One or two character initials string
 */
function getInitials(title: string): string {
  if (title === 'Untitled') return '?'
  const words = title.split(' ').filter(w => w.length > 0)
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase()
  return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase()
}
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto scrollbar-hide">
    <div
      v-if="!props.hasChats"
      class="mx-2 rounded-2xl border border-dashed border-default/80 bg-elevated/40 px-4 py-6 text-center"
    >
      <div
        class="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <UIcon name="i-lucide-message-circle-plus" class="size-5" />
      </div>
      <p class="text-sm font-medium text-highlighted">{{ props.emptyTitle }}</p>
      <p class="mt-1 text-xs leading-5 text-muted">{{ props.emptyDescription }}</p>
    </div>

    <div v-for="group in props.groups" :key="group.id" class="flex flex-col gap-1.5">
      <p class="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
        {{ group.label }}
      </p>

      <div class="flex flex-col gap-0.5">
        <div
          v-for="chat in group.items"
          :key="chat.id"
          class="group/chat relative flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all duration-200 hover:bg-elevated/80"
          :class="props.activeChatId === chat.id ? 'bg-primary/10 ring-1 ring-primary/20' : ''"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm"
            :class="stringToColor(chat.id)"
          >
            {{ getInitials(chat.label) }}
          </div>

          <NuxtLink :to="`/chat/${chat.id}`" class="min-w-0 flex-1 pr-6" @click="emit('select')">
            <span
              class="block truncate text-sm transition-colors duration-200"
              :class="[
                chat.label === 'Untitled'
                  ? 'text-muted'
                  : 'text-default group-hover/chat:text-highlighted',
                props.activeChatId === chat.id && 'font-medium'
              ]"
            >
              {{ chat.label }}
            </span>
            <span
              v-if="chat.documentCount"
              class="mt-0.5 inline-flex items-center gap-1 text-[11px] leading-none text-muted"
            >
              <UIcon name="i-lucide-files" class="size-3" />
              {{ chat.documentCount }}
              {{ chat.documentCount === 1 ? 'document' : 'documents' }}
            </span>
          </NuxtLink>

          <div v-if="props.showDelete" class="absolute right-2">
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="p-1 text-muted opacity-0 transition-all duration-200 hover:bg-error/10 hover:text-error focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-error/30 group-hover/chat:opacity-100 group-focus-within/chat:opacity-100"
              aria-label="Delete chat"
              @click.stop.prevent="emit('delete', chat.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <UButton
      v-if="props.hiddenChatCount > 0"
      color="neutral"
      variant="ghost"
      size="xs"
      block
      icon="i-lucide-chevron-down"
      :label="`Show ${Math.min(props.loadIncrement, props.hiddenChatCount)} older chats`"
      class="mx-2 justify-center text-muted"
      @click="emit('showMore')"
    />
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
