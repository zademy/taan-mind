<!--
  default.vue - Default application layout
  Provides the main layout structure with a collapsible/resizable sidebar
  containing the chat list and a main content area. Handles chat fetching,
  grouping, deletion, and navigation.
-->
<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { LazyModalConfirm, LazySettingsPersonalitiesModal } from '#components'

const route = useRoute()
const toast = useToast()
const overlay = useOverlay()
const { csrf, headerName } = useCsrf()

/** Controls the sidebar open/close state on mobile */
const open = ref(false)

/** Number of recent chats rendered initially in the sidebar */
const INITIAL_VISIBLE_CHATS = 40
/** Number of older chats appended when the user requests more */
const CHAT_LOAD_INCREMENT = 40

/** Lazy-loaded confirmation modal for chat deletion */
const deleteModal = overlay.create(LazyModalConfirm, {
  props: {
    title: 'Delete chat',
    description: 'Are you sure you want to delete this chat? This cannot be undone.'
  }
})

/** Lazy-loaded settings modal for custom personality management. */
const personalitiesModal = overlay.create(LazySettingsPersonalitiesModal)

/** Opens the personalization settings modal from the sidebar menu. */
function openPersonalizationSettings() {
  open.value = false
  personalitiesModal.open()
}

/** Sidebar settings menu items. */
const settingsItems: DropdownMenuItem[][] = [
  [
    {
      label: 'Personalization',
      icon: 'i-lucide-sparkles',
      onSelect: openPersonalizationSettings
    }
  ]
]

/**
 * Fetch all chats from the API and transform them into sidebar-compatible items.
 * Each item includes an id, label, route, icon, and creation date.
 */
const { data: chats, refresh: refreshChats } = await useFetch('/api/chats', {
  key: 'chats',
  transform: data =>
    data.map(chat => ({
      id: chat.id,
      label: chat.title || 'Untitled',
      to: `/chat/${chat.id}`,
      icon: 'i-lucide-message-circle',
      createdAt: chat.createdAt
    }))
})

/** Incremental sidebar render limit; keeps long histories cheap to hydrate */
const visibleChatLimit = ref(INITIAL_VISIBLE_CHATS)

/** Total number of chats available in the sidebar payload */
const totalChats = computed(() => chats.value?.length ?? 0)

/** Whether the user has any chats at all */
const hasChats = computed(() => totalChats.value > 0)

/** Index of the current route chat, if it exists in the loaded sidebar payload */
const activeChatIndex = computed(() => {
  const activeChatId = route.params.id
  if (typeof activeChatId !== 'string') return -1
  return chats.value?.findIndex(chat => chat.id === activeChatId) ?? -1
})

/**
 * Effective limit used for rendering.
 * It keeps the active chat visible even when opening an older chat directly.
 */
const effectiveChatLimit = computed(() => {
  const activeLimit = activeChatIndex.value >= 0 ? activeChatIndex.value + 1 : 0

  return Math.min(totalChats.value, Math.max(visibleChatLimit.value, activeLimit))
})

/** Chats currently rendered in the sidebar, newest first */
const visibleChats = computed(() => chats.value?.slice(0, effectiveChatLimit.value))

/** Remaining older chats hidden behind the incremental "show more" action */
const hiddenChatCount = computed(() => Math.max(totalChats.value - effectiveChatLimit.value, 0))

/** Reveals the next batch of older chats in the sidebar */
function showMoreChats() {
  visibleChatLimit.value = Math.min(
    totalChats.value,
    effectiveChatLimit.value + CHAT_LOAD_INCREMENT
  )
}

/** Group the visible chats by time period (e.g., Today, Yesterday, Last 7 days) */
const { groups } = useChats(visibleChats)

/**
 * Generates a consistent Tailwind background color class from a string hash.
 * Used to assign unique avatar colors to each chat.
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
 * Extracts initials from a chat title for the avatar.
 * Returns '?' for untitled chats, first letter for single words,
 * or first two letters for multi-word titles.
 */
function getInitials(title: string): string {
  if (title === 'Untitled') return '?'
  const words = title.split(' ').filter(w => w.length > 0)
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase()
  return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase()
}

/**
 * Deletes a chat after user confirmation via modal.
 * Refreshes the chat list and navigates to home if the deleted chat was active.
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

  await refreshChats()

  // Navigate to home if the user deleted the currently active chat
  if (route.params.id === id) {
    await navigateTo('/')
  }
}

/** Keyboard shortcut: press 'c' to create a new chat */
defineShortcuts({
  c: () => {
    navigateTo('/')
  }
})
</script>

<template>
  <!-- Dashboard group with rem-based sizing -->
  <UDashboardGroup unit="rem">
    <!-- Collapsible and resizable sidebar with chat list -->
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      :min-size="12"
      collapsible
      resizable
      class="border-r-0 py-4"
    >
      <!-- Sidebar header: logo and app name, collapses gracefully -->
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

      <!-- Sidebar body: new chat button and grouped chat list -->
      <template #default="{ collapsed }">
        <!-- Documents link and New chat button -->
        <div class="flex flex-col gap-1 mt-6">
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
          <UButton
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
        </div>

        <!-- Grouped chat list (hidden when sidebar is collapsed) -->
        <div v-if="!collapsed" class="mt-4 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
          <!-- Empty state when there are no chats yet -->
          <div
            v-if="!hasChats"
            class="mx-2 rounded-2xl border border-dashed border-default/80 bg-elevated/40 px-4 py-6 text-center"
          >
            <div
              class="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <UIcon name="i-lucide-message-circle-plus" class="size-5" />
            </div>
            <p class="text-sm font-medium text-highlighted">No chats yet</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              Start a new conversation and it will appear here.
            </p>
          </div>

          <div v-for="group in groups" :key="group.id" class="flex flex-col gap-1.5">
            <!-- Group label (e.g., "Today", "Yesterday") -->
            <p class="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              {{ group.label }}
            </p>

            <!-- Chat items within the group -->
            <div class="flex flex-col gap-0.5">
              <div
                v-for="chat in group.items"
                :key="chat.id"
                class="group/chat relative flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                :class="
                  route.params.id === chat.id
                    ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/20'
                    : ''
                "
              >
                <!-- Avatar with consistent gradient background based on chat ID -->
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm"
                  :class="stringToColor(chat.id)"
                >
                  {{ getInitials(chat.label) }}
                </div>

                <!-- Chat title link -->
                <NuxtLink
                  :to="`/chat/${chat.id}`"
                  class="min-w-0 flex-1 pr-6"
                  @click="open = false"
                >
                  <span
                    class="block truncate text-sm transition-colors duration-200"
                    :class="[
                      chat.label === 'Untitled'
                        ? 'text-muted'
                        : 'text-default group-hover/chat:text-highlighted',
                      route.params.id === chat.id && 'font-medium'
                    ]"
                  >
                    {{ chat.label }}
                  </span>
                </NuxtLink>

                <!-- Delete button: appears on hover with slide-in effect -->
                <div class="absolute right-2">
                  <UButton
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="opacity-0 transition-all duration-200 text-muted hover:text-error hover:bg-error/10 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-error/30 group-hover/chat:opacity-100 group-focus-within/chat:opacity-100 p-1"
                    aria-label="Delete chat"
                    @click.stop.prevent="deleteChat(chat.id)"
                  />
                </div>
              </div>
            </div>
          </div>

          <UButton
            v-if="hiddenChatCount > 0"
            color="neutral"
            variant="ghost"
            size="xs"
            block
            icon="i-lucide-chevron-down"
            :label="`Show ${Math.min(CHAT_LOAD_INCREMENT, hiddenChatCount)} older chats`"
            class="mx-2 justify-center text-muted"
            @click="showMoreChats"
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

          <span v-if="!collapsed" class="text-xs text-dimmed"> v1.0.1 </span>
        </div>
      </template>
    </UDashboardSidebar>

    <!-- Main content area with rounded card styling and glassmorphism effect -->
    <div
      class="flex-1 flex m-4 lg:ml-0 rounded-2xl ring ring-default/50 bg-default/50 shadow-xl backdrop-blur-sm min-w-0 min-h-0 overflow-clip"
    >
      <slot />
    </div>
  </UDashboardGroup>
</template>

<style scoped>
/* Hide scrollbar but preserve scrolling functionality */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
