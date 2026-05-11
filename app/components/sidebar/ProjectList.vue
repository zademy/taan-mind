<!--
  ProjectList.vue - Taanwork sidebar project navigation
  Displays user projects as expandable cards, each showing the project name,
  chat count, and up to three recent chats. Provides actions for creating
  new chats within a project and deleting projects or individual chats.
-->
<script setup lang="ts">
/** Shape of a recent chat within a sidebar project card */
export type SidebarProjectChat = {
  id: string
  title: string | null
  createdAt: string | Date
  documentCount: number
}

/** Full project shape used in the sidebar with recent chat previews */
export type SidebarProject = {
  id: string
  name: string
  createdAt: string | Date
  chatCount: number
  latestChatCreatedAt: string | Date | null
  recentChats: SidebarProjectChat[]
}

/**
 * Component props
 * @property {SidebarProject[]} projects - List of projects to display
 * @property {string | undefined} activeChatId - Currently active chat ID for highlight styling
 * @property {string | null | undefined} creatingChatProjectId - ID of the project currently creating a chat (shows spinner)
 * @property {string | null | undefined} deletingProjectId - ID of the project currently being deleted (shows spinner)
 */
const props = defineProps<{
  projects: SidebarProject[]
  activeChatId?: string
  creatingChatProjectId?: string | null
  deletingProjectId?: string | null
}>()

/**
 * Component events
 * @event createProject - Requests opening the project creation modal
 * @event createChat - Requests creating a new chat in the specified project
 * @event delete - Requests deletion of a specific chat
 * @event deleteProject - Requests deletion of a specific project
 * @event select - Fired when a chat link is clicked (used to close mobile sidebar)
 */
const emit = defineEmits<{
  createProject: []
  createChat: [projectId: string]
  delete: [chatId: string]
  deleteProject: [projectId: string]
  select: []
}>()

/**
 * Formats a chat title, defaulting to 'Untitled' if empty.
 * @param title - Raw title string, possibly null
 * @returns Non-empty display title
 */
function formatChatTitle(title: string | null) {
  return title?.trim() || 'Untitled'
}

/**
 * Extracts the first uppercase letter of a project name for the avatar.
 * Falls back to 'P' if the name is empty.
 * @param name - Project name
 */
function getProjectInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'P'
}
</script>

<template>
  <div class="flex flex-col gap-3 overflow-y-auto scrollbar-hide">
    <div
      v-if="props.projects.length === 0"
      class="mx-2 rounded-2xl border border-dashed border-default/80 bg-elevated/40 px-4 py-6 text-center"
    >
      <div
        class="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <UIcon name="i-lucide-folder-plus" class="size-5" />
      </div>
      <p class="text-sm font-medium text-highlighted">No projects yet</p>
      <p class="mt-1 text-xs leading-5 text-muted">
        Create a project to keep related chats together.
      </p>
      <UButton
        icon="i-lucide-plus"
        label="New project"
        color="primary"
        variant="soft"
        size="xs"
        class="mt-4"
        @click="emit('createProject')"
      />
    </div>

    <div
      v-for="project in props.projects"
      :key="project.id"
      class="rounded-2xl border border-default/70 bg-elevated/35 p-2"
    >
      <div class="flex items-center gap-2 px-1.5 py-1">
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/15"
        >
          {{ getProjectInitial(project.name) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">{{ project.name }}</p>
          <p class="text-xs text-muted">
            {{ project.chatCount }} {{ project.chatCount === 1 ? 'chat' : 'chats' }}
          </p>
        </div>
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="props.deletingProjectId === project.id"
          :loading="props.creatingChatProjectId === project.id"
          :aria-label="`New chat in ${project.name}`"
          @click="emit('createChat', project.id)"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="xs"
          class="text-muted hover:bg-error/10 hover:text-error"
          :loading="props.deletingProjectId === project.id"
          :disabled="props.creatingChatProjectId === project.id"
          :aria-label="`Delete ${project.name}`"
          @click="emit('deleteProject', project.id)"
        />
      </div>

      <div v-if="project.recentChats.length > 0" class="mt-2 flex flex-col gap-0.5">
        <div
          v-for="chat in project.recentChats"
          :key="chat.id"
          class="group/project-chat relative flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-default/70"
          :class="props.activeChatId === chat.id ? 'bg-primary/10 ring-1 ring-primary/20' : ''"
        >
          <UIcon name="i-lucide-message-circle" class="size-4 shrink-0 text-muted" />
          <NuxtLink :to="`/chat/${chat.id}`" class="min-w-0 flex-1 pr-7" @click="emit('select')">
            <p
              class="truncate text-xs"
              :class="
                props.activeChatId === chat.id ? 'font-medium text-highlighted' : 'text-default'
              "
            >
              {{ formatChatTitle(chat.title) }}
            </p>
            <p
              v-if="chat.documentCount"
              class="mt-0.5 flex items-center gap-1 text-[11px] text-muted"
            >
              <UIcon name="i-lucide-files" class="size-3" />
              {{ chat.documentCount }} docs
            </p>
          </NuxtLink>

          <div class="absolute right-2">
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              class="p-1 text-muted opacity-0 transition-all duration-200 hover:bg-error/10 hover:text-error focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-error/30 group-hover/project-chat:opacity-100 group-focus-within/project-chat:opacity-100"
              aria-label="Delete project chat"
              @click.stop.prevent="emit('delete', chat.id)"
            />
          </div>
        </div>
      </div>

      <UButton
        v-else
        icon="i-lucide-message-circle-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        label="Start project chat"
        block
        class="mt-2 justify-start text-muted"
        :loading="props.creatingChatProjectId === project.id"
        :disabled="props.deletingProjectId === project.id"
        @click="emit('createChat', project.id)"
      />
    </div>
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
