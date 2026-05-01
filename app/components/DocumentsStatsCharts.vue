<!--
  DocumentsStatsCharts.vue - Document statistics charts bundle
  Renders a 2x2 grid of charts visualizing document breakdowns:
  - Donut chart by processing status (Pending / Processing / Processed)
  - Area chart by month (timeline of document counts)
  - Horizontal bar chart by MIME type
  - Vertical bar chart by document type
  Loaded lazily via IntersectionObserver to keep the initial page load fast.
-->
<script setup lang="ts">
/** Orientation enum for configuring bar chart direction */
import { Orientation } from '@unovis/ts'

interface StatItem {
  label: string
  value: number
}

interface DocumentStats {
  total: number
  byStatus: StatItem[]
  byMimeType: StatItem[]
  byMonth: StatItem[]
  byDocumentType: StatItem[]
}

/** Document statistics data to visualize */
const props = defineProps<{
  data: DocumentStats
}>()

/** DonutChart: map byStatus to data array + categories record */
const donutData = computed(() => props.data.byStatus.map(s => s.value))
const donutCategories = computed<Record<string, BulletLegendItemInterface>>(
  () => {
    const colorMap: Record<string, string> = {
      Pending: '#f59e0b',
      Processing: '#3b82f6',
      Processed: '#10b981'
    }
    const result: Record<string, BulletLegendItemInterface> = {}
    props.data.byStatus.forEach((s, i) => {
      result[String(i)] = {
        name: s.label,
        color: colorMap[s.label] ?? '#6b7280'
      }
    })
    return result
  }
)

/** AreaChart: map byMonth to array of objects with month + count keys */
const areaData = computed(() =>
  props.data.byMonth.map(s => ({ month: s.label, count: s.value }))
)
const areaCategories = computed<Record<string, BulletLegendItemInterface>>(
  () => ({
    count: { name: 'Documents', color: 'var(--ui-primary)' }
  })
)
const areaXFormatter = (tick: number): string => {
  return areaData.value[tick]?.month ?? ''
}

/** BarChart (MIME types): map byMimeType to array with label + count */
const mimeData = computed(() =>
  props.data.byMimeType.map(s => ({ label: s.label, count: s.value }))
)
const mimeCategories = computed<Record<string, BulletLegendItemInterface>>(
  () => ({
    count: { name: 'Count', color: 'var(--ui-text-muted)' }
  })
)
const mimeXFormatter = (tick: number): string => {
  return mimeData.value[tick]?.label ?? ''
}

/** BarChart (Document types): map byDocumentType to array with label + count */
const docTypeData = computed(() =>
  props.data.byDocumentType.map(s => ({
    label: s.label,
    count: s.value
  }))
)
const docTypeCategories = computed<Record<string, BulletLegendItemInterface>>(
  () => ({
    count: { name: 'Count', color: '#8b5cf6' }
  })
)
const docTypeXFormatter = (tick: number): string => {
  return docTypeData.value[tick]?.label ?? ''
}
</script>

<template>
  <!-- Charts grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- DonutChart: Status -->
    <div class="rounded-xl bg-elevated ring-1 ring-default/50 p-4">
      <h3 class="text-sm font-semibold text-highlighted mb-3">
        By Status
      </h3>
      <div class="h-56 w-full flex items-center justify-center">
        <DonutChart
          v-if="donutData.length"
          :data="donutData"
          :categories="donutCategories"
          :radius="65"
          :height="210"
          :hide-legend="false"
        />
        <span v-else class="text-sm text-muted">No data available</span>
      </div>
    </div>

    <!-- AreaChart: Timeline -->
    <div class="rounded-xl bg-elevated ring-1 ring-default/50 p-4">
      <h3 class="text-sm font-semibold text-highlighted mb-3">
        By Month
      </h3>
      <div class="h-48">
        <AreaChart
          v-if="areaData.length"
          :data="areaData"
          :categories="areaCategories"
          :height="192"
          :x-formatter="areaXFormatter"
          :x-num-ticks="Math.min(6, areaData.length)"
          :y-grid-line="true"
          :hide-legend="true"
        />
        <div v-else class="flex items-center justify-center h-full">
          <span class="text-sm text-muted">No data available</span>
        </div>
      </div>
    </div>

    <!-- BarChart: MIME types -->
    <div class="rounded-xl bg-elevated ring-1 ring-default/50 p-4">
      <h3 class="text-sm font-semibold text-highlighted mb-3">
        By MIME Type
      </h3>
      <div class="h-48">
        <BarChart
          v-if="mimeData.length"
          :data="mimeData"
          :categories="mimeCategories"
          :height="192"
          :y-axis="['count']"
          x-axis="label"
          :x-formatter="mimeXFormatter"
          :orientation="Orientation.Horizontal"
          :hide-legend="true"
          :y-grid-line="true"
        />
        <div v-else class="flex items-center justify-center h-full">
          <span class="text-sm text-muted">No data available</span>
        </div>
      </div>
    </div>

    <!-- BarChart: Document types -->
    <div class="rounded-xl bg-elevated ring-1 ring-default/50 p-4">
      <h3 class="text-sm font-semibold text-highlighted mb-3">
        By Document Type
      </h3>
      <div class="h-48">
        <BarChart
          v-if="docTypeData.length"
          :data="docTypeData"
          :categories="docTypeCategories"
          :height="192"
          :y-axis="['count']"
          x-axis="label"
          :x-formatter="docTypeXFormatter"
          :hide-legend="true"
          :y-grid-line="true"
        />
        <div v-else class="flex items-center justify-center h-full">
          <span class="text-sm text-muted">No data available</span>
        </div>
      </div>
    </div>
  </div>
</template>
