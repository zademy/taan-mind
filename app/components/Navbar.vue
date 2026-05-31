<!--
  Navbar.vue - Top navigation bar
  Renders a fixed dashboard navbar with:
  - Left section: sidebar collapse toggle button (for resizable sidebar)
  - Right section: slot for extra controls (e.g., model/personality selectors),
    color mode toggle (light/dark), and a new chat shortcut button (mobile only)
  By default the navbar floats over page content, but pages can opt out when
  the header must take normal layout space.
-->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    floating?: boolean
  }>(),
  {
    floating: true
  }
)

const navbarClass = computed(() =>
  props.floating
    ? 'absolute top-0 inset-x-0 z-10 border-b border-default bg-default pointer-events-none sm:px-4'
    : 'relative z-10 border-b border-default bg-default sm:px-4'
)
</script>

<template>
  <!-- Header navbar. Floating mode keeps legacy overlay behavior for existing pages. -->
  <UDashboardNavbar
    :class="navbarClass"
    :ui="{
      left: 'pointer-events-auto min-w-0 flex-1',
      center: 'pointer-events-auto min-w-0',
      right: 'pointer-events-auto shrink-0'
    }"
  >
    <!-- Left section: sidebar toggle plus optional contextual title -->
    <template #left>
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <UDashboardSidebarCollapse class="shrink-0" />
        <slot name="title" />
      </div>
    </template>

    <!-- Center section: optional page-specific title or controls -->
    <template #default>
      <slot name="center" />
    </template>

    <!-- Right section: slot for extra controls, color mode toggle, and new chat button (mobile) -->
    <template #right>
      <slot />

      <!-- Toggle between light and dark color modes -->
      <UColorModeButton />

      <!-- New chat shortcut button, visible only on large screens and up -->
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-plus"
        to="/"
        class="lg:hidden"
        aria-label="New chat"
      />
    </template>
  </UDashboardNavbar>
</template>
