<!--
  RecentChats.vue - Compact project history section
  Renders a grid of recent chats belonging to a Taanwork project,
  displayed below the chat transcript. Each card links to the chat page
  and shows document count metadata.
-->
<script setup lang="ts">
/** Shape of a recent chat item within a project */
type RecentProjectChat = {
  id: string
  title: string | null
  createdAt: string | Date
  documentCount: number
}

/**
 * Component props
 * @property {object} project - Parent project with id and name
 * @property {RecentProjectChat[]} chats - List of recent chats to display
 */
defineProps<{
  project: { id: string; name: string }
  chats: RecentProjectChat[]
}>()

/**
 * Formats a chat title, defaulting to 'Untitled' if empty.
 * @param title - Raw title string, possibly null
 * @returns Non-empty display title
 */
function formatChatTitle(title: string | null) {
  return title?.trim() || 'Untitled'
}
</script>

<template>
  <section
    v-if="chats.length > 0"
    class="rounded-2xl border border-default/70 bg-elevated/40 p-3 shadow-sm"
    aria-label="Recent project chats"
  >
    <div class="mb-2 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wider text-muted">Recent in project</p>
        <h2 class="truncate text-sm font-medium text-highlighted">{{ project.name }}</h2>
      </div>
      <UBadge color="neutral" variant="subtle" icon="i-lucide-folder-kanban">
        {{ chats.length }} recent
      </UBadge>
    </div>

    <div class="grid gap-2 sm:grid-cols-3">
      <NuxtLink
        v-for="chat in chats"
        :key="chat.id"
        :to="`/chat/${chat.id}`"
        class="group rounded-xl border border-default/60 bg-default/60 px-3 py-2 transition hover:border-primary/30 hover:bg-primary/5"
      >
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-message-circle" class="mt-0.5 size-4 shrink-0 text-muted" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-default group-hover:text-highlighted">
              {{ formatChatTitle(chat.title) }}
            </p>
            <p class="mt-1 flex items-center gap-1 text-xs text-muted">
              <UIcon v-if="chat.documentCount" name="i-lucide-files" class="size-3" />
              <span v-if="chat.documentCount">
                {{ chat.documentCount }} {{ chat.documentCount === 1 ? 'doc' : 'docs' }}
              </span>
              <span v-else>No docs</span>
            </p>
          </div>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
