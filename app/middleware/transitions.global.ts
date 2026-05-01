/**
 * Global route middleware that disables view transitions
 * when navigating between chat pages (same route with different params).
 *
 * This prevents unwanted transition animations when switching chats.
 */
export default defineNuxtRouteMiddleware((to, from) => {
  // Only apply on the client side
  if (import.meta.server) return

  // Disable transition when navigating between chats
  if (to.params.id && from.params.id) {
    to.meta.viewTransition = false
  }
})
