<!--
  DocumentSelect.vue - Multi-document context selector dropdown
  Allows the user to attach up to five processed cached Paperless documents as
  context for a chat session. Supports server-side search with debounce.
-->
<script setup lang="ts">
/** Shape of a single document returned by the cache API */
interface DocumentResult {
  id: number
  title: string
}

/** Shape of the paginated response from the cache documents endpoint */
interface DocumentsResponse {
  results: DocumentResult[]
}

/** Shape of each item displayed in the select dropdown */
interface DocumentItem {
  label: string
  value: number
  icon?: string
  disabled?: boolean
}

/** Component props */
const props = withDefaults(
  /**
   * @property {boolean} disabled - Whether the selector is interactive
   * @property {number} max - Maximum number of selectable documents
   */
  defineProps<{
    disabled?: boolean
    max?: number
  }>(),
  {
    max: 5
  }
)

/**
 * Emitted whenever the set of selected documents changes.
 * @event selectedDocuments - Array of currently selected documents with id and title
 */
const emit = defineEmits<{
  selectedDocuments: [documents: DocumentResult[]]
}>()

/** Two-way bound value: selected document IDs in user-selected order */
const model = defineModel<number[]>({ default: () => [] })

/** Current search term typed by the user in the dropdown */
const searchTerm = ref('')

/** Whether the dropdown is loading remote document options */
const loading = ref(false)

/** Small label cache so selected documents stay readable while searching */
const itemCache = ref<Record<number, DocumentItem>>({})

/** Reactive list of selectable document items shown in the dropdown */
const items = ref<DocumentItem[]>([])

const selectedCount = computed(() => model.value.length)
const isAtLimit = computed(() => selectedCount.value >= props.max)

/** Icon displayed in the select menu trigger and menu items */
const selectedIcon = 'i-lucide-file-text'

/** Placeholder text when no documents are selected */
const placeholder = computed(() => `Documents (max ${props.max})`)

/** Search input props for Nuxt UI SelectMenu */
const searchInput = computed(() =>
  props.disabled
    ? false
    : {
        placeholder: 'Search processed documents...'
      }
)

function toDocumentItem(document: DocumentResult): DocumentItem {
  return {
    label: document.title,
    value: document.id,
    icon: selectedIcon
  }
}

function applySelectionLimit(item: DocumentItem): DocumentItem {
  return {
    ...item,
    disabled: isAtLimit.value && !model.value.includes(item.value)
  }
}

function mergeItems(documents: DocumentResult[]) {
  const byId = new Map<number, DocumentItem>()

  for (const document of documents) {
    const item = toDocumentItem(document)
    itemCache.value[document.id] = item
    byId.set(item.value, item)
  }

  // Keep selected values visible even when the current search result changes.
  for (const id of model.value) {
    byId.set(
      id,
      itemCache.value[id] ?? {
        label: `Document #${id}`,
        value: id,
        icon: selectedIcon
      }
    )
  }

  items.value = Array.from(byId.values()).map(applySelectionLimit)
  emitSelectedDocuments()
}

function emitSelectedDocuments() {
  emit(
    'selectedDocuments',
    model.value.map(id => ({
      id,
      title: itemCache.value[id]?.label ?? `Document #${id}`
    }))
  )
}

/**
 * Fetches processed documents from the cache API.
 * When a query string is provided, returns up to 10 matching results;
 * otherwise returns the 10 most recently updated documents.
 */
async function loadDocuments(query?: string) {
  loading.value = true

  try {
    const params: Record<string, string | number> = {
      processed: 1,
      ordering: '-updated_at',
      page_size: 10
    }
    if (query) {
      params.search = query
    }

    const data = await $fetch<DocumentsResponse>('/api/cache/documents', {
      params
    })

    mergeItems(data.results)
  } catch (error) {
    console.warn('[DocumentSelect] Failed to load documents', error)
    mergeItems([])
  } finally {
    loading.value = false
  }
}

/** Timer handle for debouncing search input (300ms delay) */
let debounceTimer: ReturnType<typeof setTimeout> | undefined

/** Debounces the search term changes to avoid excessive API calls */
watch(searchTerm, q => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadDocuments(q), 300)
})

/** Enforces the maximum even if model updates externally. */
watch(
  model,
  ids => {
    if (ids.length > props.max) {
      model.value = ids.slice(0, props.max)
      return
    }

    items.value = items.value.map(applySelectionLimit)
    emitSelectedDocuments()
  },
  { deep: true }
)

/** Load the initial set of documents when the component mounts */
onMounted(() => loadDocuments())

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
})
</script>

<template>
  <!-- Document selector dropdown with server-side search and ghost styling -->
  <USelectMenu
    v-model="model"
    v-model:search-term="searchTerm"
    :items="items"
    :search-input="searchInput"
    :disabled="props.disabled"
    :loading="loading"
    multiple
    ignore-filter
    size="sm"
    :icon="selectedIcon"
    variant="ghost"
    value-key="value"
    :placeholder="placeholder"
    class="max-w-full min-w-40 data-[state=open]:bg-elevated"
    :ui="{
      content: 'min-w-72 max-w-96',
      value: 'truncate',
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>
