<!--
  usage.vue - Provider-reported AI token analytics.
  Authenticated users see their own usage; administrators may switch to a
  global view. Filters are reflected in the URL for durable, shareable state.
-->
<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import {
  AI_USAGE_RANGES,
  AI_USAGE_SCOPES,
  type AIUsageModelBreakdown,
  type AIUsageRange,
  type AIUsageScope,
  type AIUsageSummary
} from '#shared/utils/aiUsage'

useHead({ title: 'Token Usage' })

const route = useRoute()
const router = useRouter()
const UBadge = resolveComponent('UBadge')
const EMPTY_SUMMARY: AIUsageSummary = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  generations: 0,
  reportedGenerations: 0,
  activeDays: 0,
  coveragePercent: 0
}

function firstQueryValue(value: string | null | (string | null)[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value) ?? undefined
}

const initialScope = firstQueryValue(route.query.scope)
const initialRange = firstQueryValue(route.query.range)

const scope = ref<AIUsageScope>(
  AI_USAGE_SCOPES.includes(initialScope as AIUsageScope) ? (initialScope as AIUsageScope) : 'mine'
)
const range = ref<AIUsageRange>(
  AI_USAGE_RANGES.includes(initialRange as AIUsageRange) ? (initialRange as AIUsageRange) : '30d'
)
const model = ref(firstQueryValue(route.query.model) || 'all')

const query = computed(() => ({
  scope: scope.value,
  range: range.value,
  model: model.value
}))

const { data, status, error, refresh } = useTokenUsage(query)
const loading = computed(() => status.value === 'pending')
const isRefreshing = ref(false)

const rangeItems = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' }
]

const scopeItems = [
  { label: 'My usage', value: 'mine', icon: 'i-lucide-user' },
  { label: 'Global', value: 'global', icon: 'i-lucide-shield-check' }
]

const modelItems = computed(() => [
  { label: 'All models', value: 'all' },
  ...(data.value?.models ?? []).map(item => ({
    label: `${item.label} · ${item.provider}`,
    value: item.model
  }))
])

const modelColumns: TableColumn<AIUsageModelBreakdown>[] = [
  {
    accessorKey: 'label',
    header: 'Model',
    cell: ({ row }) =>
      h('div', { class: 'min-w-48' }, [
        h('div', { class: 'font-medium text-highlighted' }, row.original.label),
        h('div', { class: 'text-xs text-muted' }, row.original.model)
      ])
  },
  {
    accessorKey: 'provider',
    header: 'Provider',
    cell: ({ row }) =>
      h(UBadge, { variant: 'subtle', color: 'neutral', size: 'sm' }, () => row.original.provider)
  },
  {
    accessorKey: 'inputTokens',
    header: 'Input',
    cell: ({ row }) => formatNumber(row.original.inputTokens)
  },
  {
    accessorKey: 'outputTokens',
    header: 'Output',
    cell: ({ row }) => formatNumber(row.original.outputTokens)
  },
  {
    accessorKey: 'totalTokens',
    header: 'Total',
    cell: ({ row }) => formatNumber(row.original.totalTokens)
  },
  {
    accessorKey: 'coveragePercent',
    header: 'Coverage',
    cell: ({ row }) => `${row.original.coveragePercent}%`
  }
]

const summaryCards = computed(() => {
  const summary = data.value?.summary ?? EMPTY_SUMMARY
  return [
    {
      label: 'Total tokens',
      value: formatCompact(summary.totalTokens),
      detail: `${formatNumber(summary.reportedGenerations)} reported generations`,
      icon: 'i-lucide-gauge'
    },
    {
      label: 'Input tokens',
      value: formatCompact(summary.inputTokens),
      detail: 'Prompts and context',
      icon: 'i-lucide-arrow-up-right'
    },
    {
      label: 'Output tokens',
      value: formatCompact(summary.outputTokens),
      detail: 'Generated responses',
      icon: 'i-lucide-arrow-down-left'
    },
    {
      label: 'Active days',
      value: formatNumber(summary.activeDays),
      detail: `${summary.coveragePercent}% usage coverage`,
      icon: 'i-lucide-calendar-days'
    }
  ]
})

const operationMaximum = computed(() =>
  Math.max(0, ...(data.value?.operationBreakdown.map(item => item.totalTokens) ?? []))
)

watch([scope, range, model], () => {
  void router.replace({
    query: {
      ...route.query,
      scope: scope.value,
      range: range.value,
      ...(model.value === 'all' ? { model: undefined } : { model: model.value })
    }
  })
})

watch(error, currentError => {
  if (currentError?.statusCode === 403 && scope.value === 'global') {
    scope.value = 'mine'
  }
})

watch(
  () => data.value?.models,
  models => {
    if (model.value !== 'all' && models && !models.some(item => item.model === model.value)) {
      model.value = 'all'
    }
  }
)

async function handleRefresh() {
  isRefreshing.value = true
  try {
    await refresh()
  } finally {
    isRefreshing.value = false
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en').format(value)
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value)
}

function operationWidth(value: number): string {
  if (operationMaximum.value === 0) return '0%'
  return `${Math.max(2, (value / operationMaximum.value) * 100)}%`
}
</script>

<template>
  <UDashboardPanel id="token-usage">
    <template #header>
      <UDashboardNavbar title="Token usage">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            aria-label="Refresh token usage"
            :loading="isRefreshing"
            @click="handleRefresh"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-5 px-4 pb-20 pt-4 sm:px-6">
        <header>
          <h1 class="text-xl font-semibold text-highlighted">AI token usage</h1>
          <p class="mt-1 text-sm text-muted">
            Provider-reported usage across chat, inline assistance, document processing, and OCR.
          </p>
        </header>

        <section
          class="flex flex-col gap-3 rounded-xl bg-elevated p-3 ring-1 ring-default/50 lg:flex-row lg:items-center lg:justify-between"
          aria-label="Usage filters"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UTabs
              v-if="data?.permissions.canViewGlobal"
              v-model="scope"
              :items="scopeItems"
              value-key="value"
              size="sm"
              class="w-full sm:w-auto"
            />

            <UTabs
              v-model="range"
              :items="rangeItems"
              value-key="value"
              size="sm"
              class="w-full sm:w-auto"
            />
          </div>

          <USelectMenu
            v-model="model"
            :items="modelItems"
            value-key="value"
            searchable
            icon="i-lucide-cpu"
            class="w-full lg:w-80"
            aria-label="Filter by model"
          />
        </section>

        <div v-if="loading && !data" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <USkeleton v-for="index in 4" :key="index" class="h-28 rounded-xl" />
        </div>

        <UAlert
          v-else-if="error && !data"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Unable to load token usage"
          :description="error.message"
          :actions="[{ label: 'Retry', onClick: () => refresh() }]"
        />

        <template v-else-if="data">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article
              v-for="card in summaryCards"
              :key="card.label"
              class="rounded-xl bg-elevated p-4 ring-1 ring-default/50"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-medium uppercase tracking-wide text-muted">
                    {{ card.label }}
                  </p>
                  <p class="mt-2 text-3xl font-semibold tracking-tight text-highlighted">
                    {{ card.value }}
                  </p>
                  <p class="mt-1 text-xs text-muted">{{ card.detail }}</p>
                </div>
                <UIcon :name="card.icon" class="size-5 text-primary" />
              </div>
            </article>
          </div>

          <UAlert
            v-if="data.summary.generations > 0 && data.summary.coveragePercent < 100"
            color="warning"
            variant="subtle"
            icon="i-lucide-info"
            title="Partial provider coverage"
            :description="`${data.summary.reportedGenerations} of ${data.summary.generations} generations reported token usage. Missing values are not estimated.`"
          />

          <div
            v-if="data.summary.generations === 0"
            class="flex min-h-72 flex-col items-center justify-center rounded-xl bg-elevated p-8 text-center ring-1 ring-default/50"
          >
            <div class="mb-4 rounded-full bg-primary/10 p-4">
              <UIcon name="i-lucide-chart-no-axes-combined" class="size-8 text-primary" />
            </div>
            <h2 class="text-base font-semibold text-highlighted">No usage recorded</h2>
            <p class="mt-1 max-w-md text-sm text-muted">
              New AI requests will appear here when the provider returns usage metadata.
            </p>
          </div>

          <template v-else>
            <TokenUsageCharts :daily="data.daily" :models="data.modelBreakdown" />

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <TokenUsageHeatmap :daily="data.daily" class="xl:col-span-2" />

              <section class="rounded-xl bg-elevated p-4 ring-1 ring-default/50">
                <div class="mb-4">
                  <h2 class="text-sm font-semibold text-highlighted">By operation</h2>
                  <p class="text-xs text-muted">Where tokens were consumed.</p>
                </div>

                <div class="space-y-4">
                  <div v-for="item in data.operationBreakdown" :key="item.operation">
                    <div class="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span class="truncate font-medium text-highlighted">{{ item.label }}</span>
                      <span class="shrink-0 text-muted">{{ formatCompact(item.totalTokens) }}</span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-muted/50">
                      <div
                        class="h-full rounded-full bg-primary transition-[width]"
                        :style="{ width: operationWidth(item.totalTokens) }"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section class="overflow-hidden rounded-xl bg-elevated ring-1 ring-default/50">
              <div class="border-b border-default px-4 py-3">
                <h2 class="text-sm font-semibold text-highlighted">Model details</h2>
                <p class="text-xs text-muted">Reported usage and coverage by model.</p>
              </div>
              <UTable :data="data.modelBreakdown" :columns="modelColumns" />
            </section>
          </template>

          <p class="text-right text-xs text-dimmed">
            Updated
            {{
              new Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short'
              }).format(new Date(data.generatedAt))
            }}
          </p>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
