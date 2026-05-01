<!--
  Navbar.vue - Top navigation bar
  Renders a fixed dashboard navbar with a sidebar collapse toggle on the left
  and action buttons (color mode, new chat) on the right. Accepts slot content
  for additional right-side controls.
-->
<template>
  <!-- Absolute-positioned navbar with backdrop blur and pointer event management -->
  <UDashboardNavbar
    class="absolute top-0 inset-x-0 border-b-0 z-10 backdrop-blur lg:backdrop-blur-none pointer-events-none sm:px-4"
    :ui="{ left: 'pointer-events-auto', right: 'pointer-events-auto' }"
  >
    <!-- Left section: sidebar collapse toggle button -->
    <template #left>
      <UDashboardSidebarCollapse />
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
