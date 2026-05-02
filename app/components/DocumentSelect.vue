<!--
  DocumentSelect.vue - Document context selector dropdown
  Allows the user to attach a cached Paperless document as context for the
  current chat session. Supports search-as-you-type with debounce and
  displays only already-processed documents from the local cache.
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
  value: number | null
  icon?: string
}

/** Two-way bound value: the selected document ID (null = no document) */
const model = defineModel<number | null>({ default: null })

/** When true, the dropdown is completely disabled (no search, no selection) */
const props = defineProps<{
  disabled?: boolean
}>()

/** Sentinel item representing the "no document selected" option */
const NO_DOCUMENT_ITEM: DocumentItem = {
  label: 'No document',
  value: null,
  icon: 'i-lucide-x-circle'
}

/** Current search term typed by the user in the dropdown */
const searchTerm = ref('')

/** Reactive list of selectable document items shown in the dropdown */
const items = ref<DocumentItem[]>([NO_DOCUMENT_ITEM])

/**
 * Fetches processed documents from the cache API.
 * When a query string is provided, returns up to 10 matching results;
 * otherwise returns the 5 most recently updated documents.
 */
async function loadDocuments(query?: string) {
  const params: Record<string, string | number> = {
    processed: 1,
    ordering: '-updated_at',
    page_size: query ? 10 : 5
  }
  if (query) {
    params.search = query
  }

  const data = await $fetch<DocumentsResponse>('/api/cache/documents', {
    params
  })

  items.value = [
    NO_DOCUMENT_ITEM,
    ...data.results.map(doc => ({
      label: doc.title,
      value: doc.id
    }))
  ]
}

/** Timer handle for debouncing search input (300ms delay) */
let debounceTimer: ReturnType<typeof setTimeout> | undefined

/** Debounces the search term changes to avoid excessive API calls */
watch(searchTerm, q => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadDocuments(q), 300)
})

/** Load the initial set of documents when the component mounts */
onMounted(() => loadDocuments())

/** Icon displayed in the select menu trigger */
const selectedIcon = 'i-lucide-file-text'
</script>

<template>
  <!-- Document selector dropdown with search-as-you-type and ghost styling -->
  <USelectMenu
    v-model="model"
    v-model:search-term="searchTerm"
    :items="items"
    :searchable="!props.disabled"
    :disabled="props.disabled"
    size="sm"
    :icon="selectedIcon"
    variant="ghost"
    value-key="value"
    placeholder="Document"
    class="data-[state=open]:bg-elevated"
    :ui="{
      content: 'min-w-48',
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>
