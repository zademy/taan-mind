<!--
  default.vue - Default application layout
  Provides the main dashboard shell with a collapsible sidebar, standalone chat
  history, Taanwork project navigation, and the main content card.
-->
<script setup lang="ts">
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui'
import {
  LazyModalConfirm,
  LazyProjectsCreateModal,
  LazySettingsPersonalitiesModal
} from '#components'
import { authClient } from '~/utils/auth-client'

/** Sidebar navigation mode — persisted as a cookie so it survives page reloads */
type SidebarMode = 'chats' | 'taanwork'

/** API response shape when creating a new project */
type ProjectCreateResult = {
  project: { id: string; name: string }
  chat: { id: string }
}

/** API response shape when deleting a project */
type ProjectDeleteResult = {
  project: { id: string; name: string }
  deletedChatCount: number
  activeChatDeleted: boolean
}

/** Project shape used in the sidebar, including recent chat previews */
type SidebarProject = {
  id: string
  name: string
  createdAt: string | Date
  chatCount: number
  latestChatCreatedAt: string | Date | null
  recentChats: Array<{
    id: string
    title: string | null
    createdAt: string | Date
    documentCount: number
  }>
}

const route = useRoute()
const toast = useToast()
const overlay = useOverlay()
const { csrf, headerName } = useCsrf()
const { personality } = usePersonality()
const { data: session } = await authClient.useSession(useFetch)

/** Controls the sidebar open/close state on mobile. */
const open = ref(false)

/** Sidebar mode is persisted so users can stay in Chat or Taanwork mode. */
const sidebarMode = useCookie<SidebarMode>('sidebar-mode', {
  default: () => 'chats'
})

const sidebarTabs: TabsItem[] = [
  { label: 'Chats', icon: 'i-lucide-messages-square', value: 'chats' },
  { label: 'Taanwork', icon: 'i-lucide-folder-kanban', value: 'taanwork' }
]

/** Number of recent chats rendered initially in the sidebar. */
const INITIAL_VISIBLE_CHATS = 40
/** Number of older chats appended when the user requests more. */
const CHAT_LOAD_INCREMENT = 40

const deleteModal = overlay.create(LazyModalConfirm, {
  props: {
    title: 'Delete chat',
    description: 'Are you sure you want to delete this chat? This cannot be undone.'
  }
})
const deleteProjectModal = overlay.create(LazyModalConfirm, {
  props: {
    title: 'Delete project',
    description:
      'This will permanently delete the project and all related chats. This cannot be undone.',
    confirmLabel: 'Delete project'
  }
})
const settingsModal = overlay.create(LazySettingsPersonalitiesModal)
const createProjectModal = overlay.create(LazyProjectsCreateModal)

/** Opens the administration settings modal and closes the mobile sidebar */
function openSettings() {
  open.value = false
  settingsModal.open()
}

async function signOut() {
  await authClient.signOut()
  clearNuxtData()
  await navigateTo('/login', { replace: true })
}

const settingsItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: session.value?.user.email || 'Signed in',
      icon: 'i-lucide-user',
      disabled: true
    }
  ],
  [
    {
      label: 'Administration',
      icon: 'i-lucide-shield-cog',
      onSelect: openSettings
    },
    {
      label: 'Sign out',
      icon: 'i-lucide-log-out',
      onSelect: signOut
    }
  ]
])

/** Extracts the active chat ID from the current route params */
const activeChatId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : undefined
})

const { data: chats, refresh: refreshChats } = await useFetch('/api/chats', {
  key: 'chats',
  transform: data =>
    data.map(chat => ({
      id: chat.id,
      label: chat.title || 'Untitled',
      to: `/chat/${chat.id}`,
      icon: 'i-lucide-message-circle',
      createdAt: chat.createdAt,
      documentCount: chat.documentCount ?? 0
    }))
})

const { data: projects, refresh: refreshProjects } = await useFetch<SidebarProject[]>(
  '/api/projects',
  {
    key: 'projects',
    default: () => []
  }
)

const visibleChatLimit = ref(INITIAL_VISIBLE_CHATS)
const creatingChatProjectId = ref<string | null>(null)
const deletingProjectId = ref<string | null>(null)
const totalChats = computed(() => chats.value?.length ?? 0)
const hasChats = computed(() => totalChats.value > 0)
const activeChatIndex = computed(() => {
  if (!activeChatId.value) return -1
  return chats.value?.findIndex(chat => chat.id === activeChatId.value) ?? -1
})
const effectiveChatLimit = computed(() => {
  const activeLimit = activeChatIndex.value >= 0 ? activeChatIndex.value + 1 : 0
  return Math.min(totalChats.value, Math.max(visibleChatLimit.value, activeLimit))
})
const visibleChats = computed(() => chats.value?.slice(0, effectiveChatLimit.value))
const hiddenChatCount = computed(() => Math.max(totalChats.value - effectiveChatLimit.value, 0))
const { groups } = useChats(visibleChats)

watchEffect(() => {
  if (!activeChatId.value) return
  const activeProject = projects.value?.some(project =>
    project.recentChats.some(chat => chat.id === activeChatId.value)
  )
  if (activeProject) sidebarMode.value = 'taanwork'
})

/** Increases the visible chat limit by the configured increment */
function showMoreChats() {
  visibleChatLimit.value = Math.min(
    totalChats.value,
    effectiveChatLimit.value + CHAT_LOAD_INCREMENT
  )
}

/** Refreshes both chat and project data in the sidebar simultaneously */
async function refreshSidebarData() {
  await Promise.all([refreshChats(), refreshProjects()])
  refreshNuxtData('chats')
  refreshNuxtData('projects')
}

/**
 * Opens the project creation modal and, on confirmation,
 * creates the project via the API and navigates to its starter chat.
 */
async function openCreateProject() {
  open.value = false
  const instance = createProjectModal.open()
  const result = (await instance.result) as false | { name: string }
  if (!result) return

  await createProject(result.name)
}

/**
 * Creates a new project with the given name and navigates to its starter chat.
 * Shows a toast on failure.
 * @param name - The project name entered by the user
 */
async function createProject(name: string) {
  try {
    const result = await $fetch<ProjectCreateResult>('/api/projects', {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: {
        name,
        personality: personality.value
      }
    })

    sidebarMode.value = 'taanwork'
    await refreshSidebarData()
    await navigateTo(`/chat/${result.chat.id}`)
  } catch (error) {
    toast.add({
      description: getRequestErrorMessage(error, 'Failed to create project.'),
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

/**
 * Creates a new chat within an existing project and navigates to it.
 * Prevents duplicate creation requests via the creatingChatProjectId guard.
 * @param projectId - The UUID of the target project
 */
async function createProjectChat(projectId: string) {
  if (creatingChatProjectId.value) return
  creatingChatProjectId.value = projectId

  try {
    const result = await $fetch<ProjectCreateResult>(`/api/projects/${projectId}/chats`, {
      method: 'POST',
      headers: { [headerName]: csrf },
      body: { personality: personality.value }
    })

    sidebarMode.value = 'taanwork'
    open.value = false
    await refreshSidebarData()
    await navigateTo(`/chat/${result.chat.id}`)
  } catch (error) {
    toast.add({
      description: getRequestErrorMessage(error, 'Failed to create project chat.'),
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    creatingChatProjectId.value = null
  }
}

/**
 * Deletes a chat after user confirmation and refreshes the sidebar.
 * Navigates to the home page if the deleted chat was active.
 * @param id - The UUID of the chat to delete
 */
async function deleteChat(id: string) {
  const instance = deleteModal.open()
  const result = await instance.result
  if (!result) return

  await $fetch(`/api/chats/${id}`, {
    method: 'DELETE',
    headers: { [headerName]: csrf }
  })

  toast.add({
    title: 'Chat deleted',
    description: 'Your chat has been deleted',
    icon: 'i-lucide-trash'
  })

  await refreshSidebarData()

  if (route.params.id === id) {
    await navigateTo('/')
  }
}

/**
 * Deletes a project and all its related chats after user confirmation.
 * Navigates to the home page if the currently active chat belonged to the project.
 * @param projectId - The UUID of the project to delete
 */
async function deleteProject(projectId: string) {
  if (deletingProjectId.value) return

  const instance = deleteProjectModal.open()
  const confirmed = await instance.result
  if (!confirmed) return

  deletingProjectId.value = projectId

  try {
    const result = await $fetch<ProjectDeleteResult>(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { [headerName]: csrf },
      query: activeChatId.value ? { activeChatId: activeChatId.value } : undefined
    })

    toast.add({
      title: 'Project deleted',
      description: `${result.project.name} and ${result.deletedChatCount} related ${result.deletedChatCount === 1 ? 'chat' : 'chats'} were deleted.`,
      icon: 'i-lucide-trash-2'
    })

    await refreshSidebarData()

    if (result.activeChatDeleted) {
      await navigateTo('/')
    }
  } catch (error) {
    toast.add({
      description: getRequestErrorMessage(error, 'Failed to delete project.'),
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    deletingProjectId.value = null
  }
}

/**
 * Extracts a human-readable error message from an API error response.
 * Checks nested data.message, data.statusMessage, and top-level message before falling back.
 * @param error - The unknown error thrown by $fetch
 * @param fallback - Default message if no structured message is found
 */
function getRequestErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { data?: { message?: string; statusMessage?: string }; message?: string }).data
      ?.message ||
    (error as { data?: { message?: string; statusMessage?: string }; message?: string }).data
      ?.statusMessage ||
    (error as { message?: string }).message ||
    fallback
  )
}

defineShortcuts({
  c: () => {
    navigateTo('/')
  }
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      :min-size="12"
      collapsible
      resizable
      class="border-r-0 py-4"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/"
          :class="
            collapsed
              ? 'flex items-center justify-center'
              : 'flex flex-col items-center justify-center gap-1 w-full'
          "
          active-class=""
          exact-active-class=""
          @click="open = false"
        >
          <Logo :class="collapsed ? 'h-8 w-8 shrink-0' : 'h-12 w-12 shrink-0'" />
          <span
            v-if="!collapsed"
            class="text-base text-highlighted tracking-widest uppercase font-cinzel"
          >
            Taan Mind
          </span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <div class="mt-6 flex flex-col gap-2">
          <UButton
            icon="i-lucide-file-text"
            :label="collapsed ? undefined : 'Documents'"
            :variant="route.path === '/documents' ? 'soft' : 'ghost'"
            block
            to="/documents"
            active-class=""
            inactive-class=""
            :class="[
              'transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]',
              !collapsed && 'justify-start'
            ]"
            @click="open = false"
          />

          <UTabs
            v-if="!collapsed"
            v-model="sidebarMode"
            :items="sidebarTabs"
            :content="false"
            color="neutral"
            variant="pill"
            size="sm"
            class="w-full px-1"
            :ui="{ list: 'w-full', trigger: 'flex-1 justify-center' }"
          />

          <div v-else class="flex flex-col gap-1">
            <UButton
              icon="i-lucide-messages-square"
              :variant="sidebarMode === 'chats' ? 'soft' : 'ghost'"
              block
              aria-label="Chats"
              @click="sidebarMode = 'chats'"
            />
            <UButton
              icon="i-lucide-folder-kanban"
              :variant="sidebarMode === 'taanwork' ? 'soft' : 'ghost'"
              block
              aria-label="Taanwork"
              @click="sidebarMode = 'taanwork'"
            />
          </div>

          <UButton
            v-if="sidebarMode === 'chats'"
            icon="i-lucide-plus"
            :label="collapsed ? undefined : 'New chat'"
            :variant="route.path === '/' ? 'soft' : 'ghost'"
            block
            to="/"
            active-class=""
            inactive-class=""
            :class="[
              'transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]',
              !collapsed && 'justify-start'
            ]"
            @click="open = false"
          />

          <UButton
            v-else
            icon="i-lucide-folder-plus"
            :label="collapsed ? undefined : 'New project'"
            variant="ghost"
            block
            :class="[
              'transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]',
              !collapsed && 'justify-start'
            ]"
            @click="openCreateProject"
          />
        </div>

        <div v-if="!collapsed" class="mt-4 min-h-0 flex-1 overflow-hidden">
          <SidebarChatList
            v-if="sidebarMode === 'chats'"
            :groups="groups"
            :active-chat-id="activeChatId"
            :has-chats="hasChats"
            :hidden-chat-count="hiddenChatCount"
            :load-increment="CHAT_LOAD_INCREMENT"
            @delete="deleteChat"
            @show-more="showMoreChats"
            @select="open = false"
          />

          <SidebarProjectList
            v-else
            :projects="projects ?? []"
            :active-chat-id="activeChatId"
            :creating-chat-project-id="creatingChatProjectId"
            :deleting-project-id="deletingProjectId"
            @create-project="openCreateProject"
            @create-chat="createProjectChat"
            @delete="deleteChat"
            @delete-project="deleteProject"
            @select="open = false"
          />
        </div>
      </template>

      <template #footer="{ collapsed }">
        <div class="flex w-full flex-col gap-2 px-2">
          <UDropdownMenu
            :items="settingsItems"
            :content="{ side: 'top', align: 'start', sideOffset: 8 }"
            :ui="{ content: 'min-w-56' }"
          >
            <UButton
              icon="i-lucide-settings"
              :label="collapsed ? undefined : 'Settings'"
              color="neutral"
              variant="ghost"
              block
              :class="[
                'transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]',
                !collapsed && 'justify-start'
              ]"
            />
          </UDropdownMenu>

          <span v-if="!collapsed" class="text-xs text-dimmed"> v1.0.11</span>
        </div>
      </template>
    </UDashboardSidebar>

    <div
      class="flex-1 flex m-4 lg:ml-0 rounded-2xl ring ring-default/50 bg-default/50 shadow-xl backdrop-blur-sm min-w-0 min-h-0 overflow-clip"
    >
      <slot />
    </div>
  </UDashboardGroup>
</template>
