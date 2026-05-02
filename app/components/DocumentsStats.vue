<script setup lang="ts">
const { data, status } = useDocumentStats()

/** Root element observed to lazy-load the chart bundle when it nears the viewport. */
const chartsRoot = ref<HTMLElement | null>(null)
/** Keeps the dense chart area collapsed until the user needs the breakdowns. */
const chartsExpanded = ref(false)
/** Keeps chart dependencies out of the initial documents page render. */
const shouldLoadCharts = ref(false)

const chartSkeletonCards = ['By Status', 'By Month', 'By MIME Type', 'By Document Type']

let observer: IntersectionObserver | null = null

function stopObservingCharts() {
  observer?.disconnect()
  observer = null
}

function loadCharts() {
  shouldLoadCharts.value = true
  stopObservingCharts()
}

function toggleCharts() {
  chartsExpanded.value = !chartsExpanded.value
}

function observeCharts(element: HTMLElement) {
  if (shouldLoadCharts.value || observer) return

  if (!('IntersectionObserver' in window)) {
    loadCharts()
    return
  }

  observer = new IntersectionObserver(
    entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        loadCharts()
      }
    },
    { rootMargin: '200px 0px' }
  )

  observer.observe(element)
}

watch(
  [chartsRoot, chartsExpanded],
  ([element, expanded]) => {
    if (!expanded) {
      stopObservingCharts()
      return
    }

    if (element) observeCharts(element)
  },
  { flush: 'post' }
)

onBeforeUnmount(stopObservingCharts)
</script>

<template>
  <!-- Loading state -->
  <div v-if="status === 'pending'" class="mb-6 space-y-4" aria-hidden="true">
    <div class="rounded-xl bg-elevated ring-1 ring-default/50 p-6">
      <div class="mx-auto h-10 w-24 rounded bg-muted/50 animate-pulse" />
      <div class="mx-auto mt-3 h-4 w-32 rounded bg-muted/30 animate-pulse" />
    </div>
  </div>

  <!-- No data -->
  <div v-else-if="!data" class="text-center text-sm text-muted py-8">No data available</div>

  <!-- Stats content. The total card is lightweight; chart dependencies load lazily. -->
  <div v-else class="space-y-4 mb-6">
    <!-- Total card -->
    <div class="rounded-xl bg-elevated ring-1 ring-default/50 p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-center sm:text-left">
          <p class="text-4xl font-bold text-highlighted">
            {{ data.total || 0 }}
          </p>
          <p class="text-sm text-muted mt-1">Total Documents</p>
        </div>

        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          :label="chartsExpanded ? 'Hide breakdowns' : 'Show breakdowns'"
          :trailing-icon="chartsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          :aria-expanded="chartsExpanded"
          aria-controls="document-stats-breakdowns"
          class="self-center sm:self-auto"
          @click="toggleCharts"
        />
      </div>
    </div>

    <ClientOnly v-if="chartsExpanded">
      <div id="document-stats-breakdowns" ref="chartsRoot">
        <LazyDocumentsStatsCharts v-if="shouldLoadCharts" :data="data" />

        <!-- Stable placeholder while the chart bundle waits for viewport visibility. -->
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
          aria-busy="true"
          aria-live="polite"
        >
          <div
            v-for="card in chartSkeletonCards"
            :key="card"
            class="rounded-xl bg-elevated ring-1 ring-default/50 p-4"
          >
            <h3 class="text-sm font-semibold text-highlighted mb-3">
              {{ card }}
            </h3>
            <div class="h-48 rounded-lg bg-muted/40 animate-pulse flex items-center justify-center">
              <span class="text-sm text-muted">Loading charts...</span>
            </div>
          </div>
        </div>
      </div>

      <template #fallback>
        <div class="rounded-xl bg-elevated ring-1 ring-default/50 p-6 text-center">
          <p class="text-sm text-muted">Loading charts...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
