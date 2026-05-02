<!--
  documents/index.vue - Cached documents list page
  Displays a paginated, filterable table of Paperless documents from the local
  SQLite cache. Features include:
  - Full-text search with debounced input
  - Filtering by processing status (Pending / Processing / Processed) and MIME type
  - Configurable page size and pagination
  - Auto-refresh every 5 seconds
  - Per-document reprocess action to reset OCR/AI processing
-->
<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { LazyModalConfirm } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { CacheDocument } from '~/composables/useCacheDocuments'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const { csrf, headerName } = useCsrf()
const overlay = useOverlay()

/** Set of document IDs currently being reprocessed (used to show loading state) */
const reprocessingIds = ref(new Set<number>())

/** Set of document IDs currently being deleted */
const deletingIds = ref(new Set<number>())

/** Lazy-loaded confirmation modal for document deletion */
let deleteModal: ReturnType<typeof overlay.create> | null = null

/**
 * Triggers reprocessing of a cached document.
 * Resets the document's OCR content and AI metadata, then refreshes the list.
 * Includes a minimum 1.5s delay to prevent UI flicker on fast responses.
 */
async function reprocessDocument(id: number) {
  reprocessingIds.value.add(id)
  try {
    await Promise.all([
      $fetch(`/api/cache/documents/${id}/reprocess`, {
        method: 'POST',
        headers: { [headerName]: csrf }
      }),
      new Promise(resolve => setTimeout(resolve, 1500))
    ])
    await refresh()
  } finally {
    reprocessingIds.value.delete(id)
  }
}

/** Requests user confirmation before deleting a cached document */
async function confirmDelete(id: number) {
  if (!deleteModal) {
    deleteModal = overlay.create(LazyModalConfirm, {
      props: {
        title: 'Eliminar del caché',
        description:
          '¿Eliminar este registro del caché? Esta acción no afecta al documento en Paperless.'
      }
    })
  }
  const instance = deleteModal.open()
  try {
    await instance.result
    await deleteDocument(id)
  } catch {
    // User cancelled
  }
}

/**
 * Deletes a document from the local SQLite cache.
 * Includes a minimum 1.5s delay to prevent UI flicker on fast responses.
 */
async function deleteDocument(id: number) {
  deletingIds.value.add(id)
  try {
    await Promise.all([
      $fetch(`/api/cache/documents/${id}`, {
        method: 'DELETE',
        headers: { [headerName]: csrf }
      }),
      new Promise(resolve => setTimeout(resolve, 1500))
    ])
    await refresh()
  } finally {
    deletingIds.value.delete(id)
  }
}

/** Current page number (1-based) */
const page = ref(1)
/** Number of items displayed per page */
const pageSize = ref(25)

/** Raw search input value (updated on every keystroke) */
const searchQuery = ref('')
/** Debounced search value used in API queries (updated 300ms after typing stops) */
const debouncedSearch = ref<string | undefined>(undefined)
/** Filter for document processing status */
const statusFilter = ref<string>('all')
/** Filter for document MIME type */
const typeFilter = ref<string>('all')

/** Debounce timer reference for search input */
let searchTimeout: ReturnType<typeof setTimeout> | undefined

/** Debounces search input by 300ms and resets to page 1 */
watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val || undefined
    page.value = 1
  }, 300)
})

/** Converts the status filter value to a numeric processed flag (or undefined for all) */
const processedFilter = computed(() => {
  if (statusFilter.value === 'all') return undefined
  return Number(statusFilter.value)
})

/** Reset to page 1 when status or type filters change */
watch([statusFilter, typeFilter], () => {
  page.value = 1
})

/** Fetches cached documents with current filters, pagination, and ordering */
const { data, status, refresh } = useCacheDocuments({
  page,
  pageSize,
  ordering: '-updated_at',
  search: debouncedSearch,
  processed: processedFilter,
  mimeType: computed(() =>
    typeFilter.value === 'all' ? undefined : typeFilter.value
  )
})

/** Whether the initial data fetch is still in progress */
const loading = computed(() => status.value === 'pending')

/** Whether a manual refresh is in progress (for the refresh button spinner) */
const isRefreshing = ref(false)

/** Manually refreshes the document list without adding artificial delay */
async function handleRefresh() {
  isRefreshing.value = true
  try {
    await refresh()
  } finally {
    isRefreshing.value = false
  }
}

/** Auto-refresh interval reference */
let refreshInterval: ReturnType<typeof setInterval> | undefined

/** Start auto-refreshing every 5 seconds when the component mounts */
onMounted(() => {
  refreshInterval = setInterval(() => {
    refresh()
  }, 5000)
})

/** Clear the auto-refresh interval when the component unmounts */
onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

/** Available processing status filter options */
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: '0' },
  { label: 'Processed', value: '1' },
  { label: 'Processing', value: '2' }
]

/** Available MIME type filter options covering common document formats */
const typeOptions = [
  { label: 'All types', value: 'all' },
  { label: 'PDF', value: 'application/pdf' },
  {
    label: 'DOCX',
    value:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  },
  { label: 'DOC', value: 'application/msword' },
  { label: 'ODT', value: 'application/vnd.oasis.opendocument.text' },
  {
    label: 'XLSX',
    value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  { label: 'XLS', value: 'application/vnd.ms-excel' },
  { label: 'ODS', value: 'application/vnd.oasis.opendocument.spreadsheet' },
  { label: 'PNG', value: 'image/png' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'TIFF', value: 'image/tiff' },
  { label: 'EML', value: 'message/rfc822' },
  { label: 'TXT', value: 'text/plain' },
  { label: 'CSV', value: 'text/csv' }
]

/** Available page size options for the pagination selector */
const pageSizeOptions = [
  { label: '10', value: '10' },
  { label: '25', value: '25' },
  { label: '50', value: '50' },
  { label: '100', value: '100' }
]

/** String representation of the page size (for the select component binding) */
const pageSizeStr = ref('25')

/** Skeleton rows used while the initial table payload is loading */
const tableSkeletonRows = Array.from({ length: 6 }, (_, index) => index)

/** Shows skeletons only for the initial table load, not for background refreshes */
const showTableSkeleton = computed(
  () => loading.value && !data.value?.results?.length
)

/** Updates the numeric page size and resets to page 1 when changed */
watch(pageSizeStr, (val) => {
  pageSize.value = Number(val)
  page.value = 1
})

/** 1-based index of the first result shown on the current page */
const resultsFrom = computed(() => {
  if (!data.value || data.value.count === 0) return 0
  return (page.value - 1) * pageSize.value + 1
})

/** 1-based index of the last result shown on the current page */
const resultsTo = computed(() => {
  if (!data.value) return 0
  return Math.min(page.value * pageSize.value, data.value.count)
})

/**
 * Maps common MIME types to short human-readable labels.
 * Falls back to the uppercase file extension for unknown types.
 */
function mimeLabel(mime: string | null): string {
  if (!mime) return '—'
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'DOCX',
    'application/msword': 'DOC',
    'application/vnd.oasis.opendocument.text': 'ODT',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/tiff': 'TIFF',
    'message/rfc822': 'EML',
    'text/plain': 'TXT',
    'text/csv': 'CSV'
  }

  if (map[mime]) return map[mime]

  const subtype = mime.split('/').pop()
  if (!subtype) return mime

  const cleanSubtype = subtype
    .replace(/^vnd\./, '')
    .replace(/^x-/, '')
    .split(/[.+-]/)
    .pop()

  return cleanSubtype?.toUpperCase() || mime
}

/**
 * Formats an ISO date string into a readable locale string.
 * Returns an em-dash if the date is null.
 */
function formatDuration(doc: CacheDocument): string {
  if (!doc.processingStartedAt) return '-'
  if (!doc.processingCompletedAt) {
    if (doc.processed === 2) return 'In progress...'
    return '-'
  }
  const start = new Date(doc.processingStartedAt).getTime()
  const end = new Date(doc.processingCompletedAt).getTime()
  const diff = end - start
  if (diff < 0) return '-'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/** Table column definitions for the documents data table */
const columns: TableColumn<CacheDocument>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    enableSorting: true,
    meta: {
      class: {
        th: 'hidden sm:table-cell w-16 text-right',
        td: 'hidden sm:table-cell w-16 text-right'
      }
    },
    cell: ({ row }) =>
      h(
        'span',
        { class: 'font-mono text-xs text-muted' },
        `${row.getValue('id')}`
      )
  },
  {
    accessorKey: 'title',
    header: 'Title',
    enableSorting: true,
    meta: {
      class: {
        th: 'min-w-36 max-w-[10rem] sm:min-w-50 sm:max-w-none',
        td: 'min-w-36 max-w-[10rem] sm:min-w-50 sm:max-w-none'
      }
    },
    cell: ({ row }) =>
      h(
        'span',
        {
          class: 'block truncate text-highlighted',
          title: row.getValue('title') as string
        },
        row.getValue('title') as string
      )
  },
  {
    accessorKey: 'mimeType',
    header: 'Type',
    meta: {
      class: {
        th: 'w-20 sm:w-24',
        td: 'w-20 sm:w-24'
      }
    },
    cell: ({ row }) =>
      h(
        UBadge,
        {
          variant: 'subtle',
          color: 'neutral',
          size: 'sm'
        },
        () => mimeLabel(row.getValue('mimeType'))
      )
  },
  {
    accessorKey: 'pageCount',
    header: 'Pages',
    enableSorting: true,
    meta: {
      class: {
        th: 'hidden sm:table-cell w-20 text-center',
        td: 'hidden sm:table-cell w-20 text-center'
      }
    },
    cell: ({ row }) => {
      const pages = row.getValue('pageCount') as number | null
      return pages != null ? `${pages}` : '—'
    }
  },
  {
    accessorKey: 'processed',
    header: 'Status',
    enableSorting: true,
    meta: {
      class: {
        th: 'w-24 sm:w-28',
        td: 'w-24 sm:w-28'
      }
    },
    cell: ({ row }) => {
      const val = row.getValue('processed')
      const label
        = val === 1 ? 'Processed' : val === 2 ? 'Processing' : 'Pending'
      const color = val === 1 ? 'success' : val === 2 ? 'warning' : 'neutral'
      return h(
        UBadge,
        {
          variant: 'subtle',
          color,
          size: 'sm'
        },
        () => label
      )
    }
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    enableSorting: false,
    meta: {
      class: {
        th: 'hidden lg:table-cell w-32',
        td: 'hidden lg:table-cell w-32'
      }
    },
    cell: ({ row }) => {
      const doc = row.original
      const duration = formatDuration(doc)
      if (doc.processed === 2 && !doc.processingCompletedAt) {
        return h(
          UBadge,
          { variant: 'subtle', color: 'info', size: 'sm' },
          () => 'In progress...'
        )
      }
      return h('span', { class: 'text-sm text-muted' }, duration)
    }
  },
  {
    accessorKey: 'paperlessModified',
    header: 'Modified',
    enableSorting: true,
    meta: {
      class: {
        th: 'hidden md:table-cell w-48',
        td: 'hidden md:table-cell w-48'
      }
    },
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-sm text-muted' },
        formatDate(row.getValue('paperlessModified'))
      )
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: {
      class: {
        th: 'w-14 sm:w-20 text-center',
        td: 'w-14 sm:w-20 text-center'
      }
    },
    cell: ({ row }) => {
      const id = row.original.id
      const isProcessing = row.original.processed === 2
      const isReprocessing = reprocessingIds.value.has(id)
      const isDeleting = deletingIds.value.has(id)
      const busy = isProcessing || isReprocessing || isDeleting
      return h('div', { class: 'flex items-center justify-center gap-1' }, [
        h(UButton, {
          'icon': 'i-lucide-refresh-cw',
          'size': 'xs',
          'variant': 'ghost',
          'color': 'neutral',
          'title': 'Reprocess',
          'aria-label': `Reprocess document ${id}`,
          'disabled': busy,
          'loading': isReprocessing,
          'onClick': () => reprocessDocument(id)
        }),
        h(UButton, {
          'icon': 'i-lucide-trash-2',
          'size': 'xs',
          'variant': 'ghost',
          'color': 'error',
          'title': 'Delete from cache',
          'aria-label': `Delete document ${id} from cache`,
          'disabled': busy,
          'loading': isDeleting,
          'onClick': () => confirmDelete(id)
        })
      ])
    }
  }
]
</script>

<template>
  <UDashboardPanel id="documents" :ui="{ body: 'p-0 sm:p-0 overflow-y-auto' }">
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <div class="px-4 sm:px-6 pt-14 pb-20 space-y-4">
        <!-- Page title and document count -->
        <div>
          <div>
            <h1 class="text-xl font-semibold text-highlighted">
              Documents
            </h1>
            <p v-if="data" class="text-sm text-muted mt-0.5">
              {{ data.count }} document{{ data.count !== 1 ? "s" : "" }}
            </p>
          </div>
        </div>

        <!-- Document statistics overview -->
        <DocumentsStats />

        <!-- Toolbar: page size, search, status filter, type filter, and refresh -->
        <div
          class="flex flex-col gap-3 pb-3 border-b border-default lg:flex-row lg:items-center"
        >
          <div
            class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:flex-nowrap"
          >
            <USelect
              v-model="pageSizeStr"
              :items="pageSizeOptions"
              aria-label="Documents per page"
              class="w-full sm:w-24"
            />
            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              placeholder="All statuses"
              aria-label="Processing status"
              class="w-full sm:w-40"
            />
            <USelect
              v-model="typeFilter"
              :items="typeOptions"
              placeholder="All types"
              aria-label="Document type"
              class="col-span-2 w-full sm:col-span-1 sm:w-40"
            />
          </div>

          <div class="flex min-w-0 flex-1 gap-2">
            <UInput
              v-model="searchQuery"
              placeholder="Search documents..."
              icon="i-lucide-search"
              aria-label="Search documents"
              class="min-w-0 flex-1"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              variant="ghost"
              title="Refresh"
              aria-label="Refresh documents"
              :loading="isRefreshing"
              @click="handleRefresh"
            />
          </div>
        </div>

        <!-- Documents data table -->
        <div
          v-if="showTableSkeleton"
          class="overflow-hidden rounded-xl ring-1 ring-default/50"
        >
          <div
            v-for="row in tableSkeletonRows"
            :key="row"
            class="grid grid-cols-[minmax(0,1fr)_5rem_6rem_3.5rem] items-center gap-3 border-b border-default px-4 py-3 last:border-b-0"
            aria-hidden="true"
          >
            <div class="space-y-2">
              <div class="h-4 w-4/5 rounded bg-muted/50 animate-pulse" />
              <div class="h-3 w-1/2 rounded bg-muted/30 animate-pulse" />
            </div>
            <div class="h-6 rounded-full bg-muted/40 animate-pulse" />
            <div class="h-6 rounded-full bg-muted/40 animate-pulse" />
            <div class="mx-auto size-8 rounded-lg bg-muted/40 animate-pulse" />
          </div>
        </div>

        <div v-else class="min-w-0 overflow-x-auto">
          <UTable
            :data="data?.results || []"
            :columns="columns"
            :loading="loading"
            :sticky="true"
            :sorting-options="{ manualSorting: false }"
            class="w-full"
          />
        </div>

        <!-- Empty state when no documents match the filters -->
        <div
          v-if="data && data.results.length === 0 && !loading"
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <UIcon name="i-lucide-file-search" class="size-10 text-muted mb-3" />
          <p class="text-sm text-muted">
            No documents found matching your filters.
          </p>
        </div>

        <!-- Footer: results summary and pagination controls -->
        <div
          v-if="data && data.count > 0"
          class="flex flex-col gap-3 pt-4 border-t border-default sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-muted">
            Showing {{ resultsFrom }}–{{ resultsTo }} of
            {{ data.count }} documents
          </p>

          <UPagination
            v-model="page"
            :total="data.count"
            :items-per-page="pageSize"
            :show-edges="true"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
